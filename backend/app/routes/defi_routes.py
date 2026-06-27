# backend/app/routes/defi_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import logging

from app.db import get_db
from app.models.defi_model import DeFiProject
from app.models.project_model import ProjectRecord
from app.models.risk_history_model import RiskHistory
from app.services.risk_analyzer import calculate_risk

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class RiskAnalysisRequest(BaseModel):
    name: str
    protocol_type: str
    total_value_locked: float
    audit_status: str
    liquidity_score: float
    user_activity_score: float


class BulkDeleteRequest(BaseModel):
    project_ids: List[int]


@router.post("/analyze_risk")
def analyze_risk(request: RiskAnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyze risk for a DeFi protocol
    Creates a new project record with risk assessment
    """
    try:
        # Create DeFi project object
        project = DeFiProject(
            name=request.name,
            protocol_type=request.protocol_type,
            total_value_locked=request.total_value_locked,
            audit_status=request.audit_status,
            liquidity_score=request.liquidity_score,
            user_activity_score=request.user_activity_score
        )
        
        # Calculate risk
        risk_result = calculate_risk(project)
        
        # Save to database
        db_project = ProjectRecord(
            name=request.name,
            protocol_type=request.protocol_type,
            total_value_locked=request.total_value_locked,
            audit_status=request.audit_status,
            liquidity_score=request.liquidity_score,
            user_activity_score=request.user_activity_score,
            risk_score=risk_result["overall_risk"],
            risk_level=risk_result["risk_level"],
            risk_breakdown=risk_result["risk_breakdown"]
        )
        
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        
        # Create initial historical snapshot
        history = RiskHistory(
            project_id=db_project.id,
            risk_score=risk_result["overall_risk"],
            risk_level=risk_result["risk_level"],
            smart_contract_risk=risk_result["risk_breakdown"]["smart_contract_risk"],
            liquidity_risk=risk_result["risk_breakdown"]["liquidity_risk"],
            financial_risk=risk_result["risk_breakdown"]["financial_risk"],
            operational_risk=risk_result["risk_breakdown"]["operational_risk"],
            total_value_locked=request.total_value_locked,
            liquidity_score=request.liquidity_score,
            user_activity_score=request.user_activity_score,
            audit_status=request.audit_status,
            snapshot_type="initial"
        )
        
        db.add(history)
        db.commit()
        
        logger.info(f"✅ Created project: {request.name} (Risk: {risk_result['overall_risk']:.1f})")
        
        return {
            "project_id": db_project.id,
            "name": request.name,
            "risk_score": risk_result["overall_risk"],
            "risk_level": risk_result["risk_level"],
            "risk_breakdown": risk_result["risk_breakdown"],
            "recommendations": risk_result.get("recommendations", [])
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error analyzing risk: {e}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")


@router.get("/projects")
def get_all_projects(db: Session = Depends(get_db)):
    """
    Get all analyzed projects
    """
    try:
        projects = db.query(ProjectRecord).all()
        logger.info(f"📤 Retrieved {len(projects)} projects")
        return projects
    except Exception as e:
        logger.error(f"❌ Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")


@router.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    """
    Get a specific project by ID
    """
    try:
        project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")


@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a protocol and all its historical data
    """
    try:
        # Find the project
        project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_name = project.name
        
        # Delete all historical snapshots for this project
        deleted_history = db.query(RiskHistory).filter(
            RiskHistory.project_id == project_id
        ).delete()
        
        # Delete the project itself
        db.delete(project)
        db.commit()
        
        logger.info(f"🗑️ Deleted project: {project_name} (ID: {project_id})")
        logger.info(f"📊 Removed {deleted_history} historical snapshots")
        
        return {
            "success": True,
            "message": f"Successfully deleted {project_name}",
            "deleted_snapshots": deleted_history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")


@router.delete("/projects/bulk")
def delete_multiple_projects(request: BulkDeleteRequest, db: Session = Depends(get_db)):
    """
    Delete multiple protocols at once
    Body: {"project_ids": [1, 2, 3]}
    """
    try:
        deleted_projects = []
        total_snapshots = 0
        
        for project_id in request.project_ids:
            project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
            
            if project:
                project_name = project.name
                
                # Delete history
                deleted_history = db.query(RiskHistory).filter(
                    RiskHistory.project_id == project_id
                ).delete()
                
                # Delete project
                db.delete(project)
                
                deleted_projects.append(project_name)
                total_snapshots += deleted_history
        
        db.commit()
        
        logger.info(f"🗑️ Bulk delete: {len(deleted_projects)} projects")
        logger.info(f"📊 Removed {total_snapshots} total snapshots")
        
        return {
            "success": True,
            "message": f"Successfully deleted {len(deleted_projects)} protocols",
            "deleted_projects": deleted_projects,
            "deleted_snapshots": total_snapshots
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error in bulk delete: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Get overall statistics
    """
    try:
        projects = db.query(ProjectRecord).all()
        
        if not projects:
            return {
                "total_projects": 0,
                "total_tvl": 0,
                "average_risk": 0,
                "risk_distribution": {
                    "Low": 0,
                    "Medium": 0,
                    "High": 0,
                    "Critical": 0
                }
            }
        
        total_tvl = sum(p.total_value_locked for p in projects)
        avg_risk = sum(p.risk_score for p in projects) / len(projects)
        
        risk_distribution = {
            "Low": sum(1 for p in projects if p.risk_level == "Low"),
            "Medium": sum(1 for p in projects if p.risk_level == "Medium"),
            "High": sum(1 for p in projects if p.risk_level == "High"),
            "Critical": sum(1 for p in projects if p.risk_level == "Critical")
        }
        
        return {
            "total_projects": len(projects),
            "total_tvl": total_tvl,
            "average_risk": round(avg_risk, 2),
            "risk_distribution": risk_distribution
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")