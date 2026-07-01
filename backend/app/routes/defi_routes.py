# backend/app/routes/defi_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.db import get_db
from app.models.defi_model import DeFiProject
from app.models.project_model import ProjectRecord
from app.models.risk_history_model import RiskHistory
from app.models.user_model import User
from app.deps import get_current_user
from app.services.risk_analyzer import calculate_risk
from app.services.defillama_service import defillama_service

logger = logging.getLogger(__name__)

router = APIRouter()


class RiskAnalysisRequest(BaseModel):
    name: str
    protocol_type: str
    total_value_locked: float
    audit_status: str
    # Optional now — kept so the existing frontend payload still validates.
    liquidity_score: Optional[float] = 0.0
    user_activity_score: Optional[float] = 0.0
    # Optional slug: if the frontend knows the DeFiLlama slug (from search),
    # send it so we can fetch real metrics. Falls back to name-derived slug.
    slug: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    project_ids: List[int]


def _fetch_real_metrics(name: str, slug: Optional[str]) -> dict:
    """
    Try to fetch real DeFiLlama metrics for this protocol.
    Returns the extract_protocol_info dict, or neutral defaults if not found.
    """
    candidate = slug or name.lower().replace(" ", "-")
    data = defillama_service.get_protocol_data(candidate, force_fresh=False)
    if data:
        info = defillama_service.extract_protocol_info(data)
        info["_source"] = "defillama"
        return info

    logger.warning(f"⚠️ No DeFiLlama data for '{candidate}' — using neutral metrics")
    return {
        "tvl_volatility": 0.0, "max_drawdown": 0.0,
        "change_1d": 0.0, "change_7d": 0.0, "change_30d": 0.0,
        "top_chain_share": 100.0, "chain_count": 1, "top_chain": "Unknown",
        "mcap_to_tvl": None, "_source": "manual",
    }


@router.post("/analyze_risk")
def analyze_risk(
    request: RiskAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze risk for a DeFi protocol using REAL metrics where available.
    Creates a new project record OWNED BY THE CURRENT USER + initial snapshot.
    """
    try:
        # One user can't track the same protocol twice — friendly 409 instead
        # of letting the (user_id, name) unique constraint throw a raw DB error.
        existing = db.query(ProjectRecord).filter(
            ProjectRecord.user_id == current_user.id,
            ProjectRecord.name == request.name,
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"You're already tracking '{request.name}'.",
            )

        # Fetch real signals (or neutral defaults for manual/unknown protocols)
        metrics = _fetch_real_metrics(request.name, request.slug)

        # Build the scoring object (not persisted — used only for calculate_risk)
        defi_project = DeFiProject(
            name=request.name,
            protocol_type=request.protocol_type,
            total_value_locked=request.total_value_locked,
            audit_status=request.audit_status,
            tvl_volatility=metrics["tvl_volatility"],
            max_drawdown=metrics["max_drawdown"],
            change_1d=metrics["change_1d"],
            change_7d=metrics["change_7d"],
            change_30d=metrics["change_30d"],
            top_chain_share=metrics["top_chain_share"],
            chain_count=metrics["chain_count"],
            mcap_to_tvl=metrics["mcap_to_tvl"],
        )

        risk_result = calculate_risk(defi_project)

        # Persist project row, tagged with the owner's user_id
        db_project = ProjectRecord(
            user_id=current_user.id,                     # NEW — owner
            name=request.name,
            protocol_type=request.protocol_type,
            total_value_locked=request.total_value_locked,
            audit_status=request.audit_status,
            risk_score=risk_result["overall_risk"],
            risk_level=risk_result["risk_level"],
            risk_breakdown=risk_result["risk_breakdown"],
            tvl_volatility=metrics["tvl_volatility"],
            max_drawdown=metrics["max_drawdown"],
            change_1d=metrics["change_1d"],
            change_7d=metrics["change_7d"],
            change_30d=metrics["change_30d"],
            top_chain_share=metrics["top_chain_share"],
            chain_count=metrics["chain_count"],
            top_chain=metrics["top_chain"],
            mcap_to_tvl=metrics["mcap_to_tvl"],
        )

        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        # Initial historical snapshot
        history = RiskHistory(
            project_id=db_project.id,
            risk_score=risk_result["overall_risk"],
            risk_level=risk_result["risk_level"],
            smart_contract_risk=risk_result["risk_breakdown"]["smart_contract_risk"],
            liquidity_risk=risk_result["risk_breakdown"]["liquidity_risk"],
            financial_risk=risk_result["risk_breakdown"]["financial_risk"],
            operational_risk=risk_result["risk_breakdown"]["operational_risk"],
            total_value_locked=request.total_value_locked,
            audit_status=request.audit_status,
            tvl_volatility=metrics["tvl_volatility"],
            max_drawdown=metrics["max_drawdown"],
            change_1d=metrics["change_1d"],
            change_7d=metrics["change_7d"],
            change_30d=metrics["change_30d"],
            top_chain_share=metrics["top_chain_share"],
            chain_count=metrics["chain_count"],
            mcap_to_tvl=metrics["mcap_to_tvl"],
            snapshot_type="initial",
        )
        db.add(history)
        db.commit()

        logger.info(f"✅ Created project: {request.name} for user {current_user.id} "
                    f"(Risk: {risk_result['overall_risk']}, source: {metrics['_source']})")

        return {
            "project_id": db_project.id,
            "name": request.name,
            "risk_score": risk_result["overall_risk"],
            "risk_level": risk_result["risk_level"],
            "risk_breakdown": risk_result["risk_breakdown"],
            "signals": risk_result.get("signals", {}),
            "recommendations": risk_result.get("recommendations", []),
            "data_source": metrics["_source"],
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error analyzing risk: {e}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")


@router.get("/projects")
def get_all_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        projects = db.query(ProjectRecord).filter(
            ProjectRecord.user_id == current_user.id
        ).all()
        logger.info(f"📤 Retrieved {len(projects)} projects for user {current_user.id}")
        return projects
    except Exception as e:
        logger.error(f"❌ Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")


# IMPORTANT: /projects/bulk is declared BEFORE /projects/{project_id} so that a
# DELETE to /projects/bulk resolves here, instead of trying to parse "bulk" as an int id.
@router.delete("/projects/bulk")
def delete_multiple_projects(
    request: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        deleted_projects = []
        total_snapshots = 0
        for project_id in request.project_ids:
            project = db.query(ProjectRecord).filter(
                ProjectRecord.id == project_id,
                ProjectRecord.user_id == current_user.id,     # ownership
            ).first()
            if project:
                project_name = project.name
                deleted_history = db.query(RiskHistory).filter(
                    RiskHistory.project_id == project_id
                ).delete()
                db.delete(project)
                deleted_projects.append(project_name)
                total_snapshots += deleted_history
        db.commit()
        logger.info(f"🗑️ Bulk delete: {len(deleted_projects)} projects for user {current_user.id}")
        return {
            "success": True,
            "message": f"Successfully deleted {len(deleted_projects)} protocols",
            "deleted_projects": deleted_projects,
            "deleted_snapshots": total_snapshots,
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error in bulk delete: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")


@router.get("/projects/{project_id}")
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = db.query(ProjectRecord).filter(
            ProjectRecord.id == project_id,
            ProjectRecord.user_id == current_user.id,         # ownership
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = db.query(ProjectRecord).filter(
            ProjectRecord.id == project_id,
            ProjectRecord.user_id == current_user.id,         # ownership
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        project_name = project.name
        deleted_history = db.query(RiskHistory).filter(
            RiskHistory.project_id == project_id
        ).delete()
        db.delete(project)
        db.commit()

        logger.info(f"🗑️ Deleted project: {project_name} (ID: {project_id}) for user {current_user.id}")
        return {
            "success": True,
            "message": f"Successfully deleted {project_name}",
            "deleted_snapshots": deleted_history,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")


@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        projects = db.query(ProjectRecord).filter(
            ProjectRecord.user_id == current_user.id
        ).all()
        if not projects:
            return {
                "total_projects": 0, "total_tvl": 0, "average_risk": 0,
                "risk_distribution": {"Low": 0, "Medium": 0, "High": 0, "Critical": 0},
            }
        total_tvl = sum(p.total_value_locked for p in projects)
        avg_risk = sum(p.risk_score for p in projects) / len(projects)
        risk_distribution = {
            "Low": sum(1 for p in projects if p.risk_level == "Low"),
            "Medium": sum(1 for p in projects if p.risk_level == "Medium"),
            "High": sum(1 for p in projects if p.risk_level == "High"),
            "Critical": sum(1 for p in projects if p.risk_level == "Critical"),
        }
        return {
            "total_projects": len(projects),
            "total_tvl": total_tvl,
            "average_risk": round(avg_risk, 2),
            "risk_distribution": risk_distribution,
        }
    except Exception as e:
        logger.error(f"❌ Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")