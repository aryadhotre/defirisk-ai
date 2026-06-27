# backend/app/routes/analytics_routes.py
import logging
logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from typing import List, Optional

from app.models.risk_history_model import RiskHistory
from app.models.project_model import ProjectRecord
from app.models.defi_model import DeFiProject
from app.db import get_db
from app.services.defillama_service import defillama_service
from app.services.risk_analyzer import calculate_risk

router = APIRouter()


@router.get("/history/{project_id}")
def get_project_history(
    project_id: int, 
    days: Optional[int] = 30,
    db: Session = Depends(get_db)
):
    """
    Get risk history for a specific project
    Returns time-series data for the last N days
    """
    try:
        # Check if project exists
        project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get history entries
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        history = db.query(RiskHistory).filter(
            RiskHistory.project_id == project_id,
            RiskHistory.timestamp >= cutoff_date
        ).order_by(RiskHistory.timestamp.asc()).all()
        
        # Format response
        return {
            "project_id": project_id,
            "project_name": project.name,
            "days": days,
            "data_points": len(history),
            "history": [
                {
                    "timestamp": h.timestamp.isoformat(),
                    "risk_score": h.risk_score,
                    "risk_level": h.risk_level,
                    "breakdown": {
                        "smart_contract_risk": h.smart_contract_risk,
                        "liquidity_risk": h.liquidity_risk,
                        "financial_risk": h.financial_risk,
                        "operational_risk": h.operational_risk
                    },
                    "tvl": h.total_value_locked,
                    "liquidity_score": h.liquidity_score,
                    "user_activity_score": h.user_activity_score,
                    "audit_status": h.audit_status
                }
                for h in history
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


# Replace your /trends endpoint in analytics_routes.py with this:

@router.get("/trends")
def get_risk_trends(days: Optional[int] = 7, db: Session = Depends(get_db)):
    """
    Get TVL trends for all projects
    Shows which protocols are gaining/losing value
    FIXED: Now calculates TVL % change instead of risk_score % change
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        projects = db.query(ProjectRecord).all()
        
        trends = []
        for project in projects:
            history = db.query(RiskHistory).filter(
                RiskHistory.project_id == project.id,
                RiskHistory.timestamp >= cutoff_date
            ).order_by(RiskHistory.timestamp.asc()).all()
            
            if len(history) >= 2:
                old_tvl = history[0].total_value_locked
                new_tvl = history[-1].total_value_locked
                tvl_change = new_tvl - old_tvl
                tvl_change_percent = (tvl_change / old_tvl * 100) if old_tvl > 0 else 0
                
                old_risk = history[0].risk_score
                new_risk = history[-1].risk_score
                risk_change = new_risk - old_risk
                
                trends.append({
                    "project_id": project.id,
                    "project_name": project.name,
                    "current_risk": project.risk_score,
                    "current_tvl": new_tvl,
                    "tvl_change": round(tvl_change, 2),
                    "tvl_change_percent": round(tvl_change_percent, 2),
                    "risk_change": round(risk_change, 2),
                    "trend": "increasing" if tvl_change > 0 else "decreasing" if tvl_change < 0 else "stable",
                    "data_points": len(history),
                    "oldest_timestamp": history[0].timestamp.isoformat(),
                    "newest_timestamp": history[-1].timestamp.isoformat()
                })
            elif len(history) == 1:
                # Only 1 data point - no change to calculate yet
                trends.append({
                    "project_id": project.id,
                    "project_name": project.name,
                    "current_risk": project.risk_score,
                    "current_tvl": project.total_value_locked,
                    "tvl_change": 0,
                    "tvl_change_percent": 0,
                    "risk_change": 0,
                    "trend": "insufficient_data",
                    "data_points": len(history),
                    "message": "Need more snapshots to calculate trend"
                })
        
        # Sort by absolute TVL change percent (most volatile first)
        trends.sort(key=lambda x: abs(x.get("tvl_change_percent", 0)), reverse=True)
        
        return {
            "timeframe_days": days,
            "projects_tracked": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"❌ Error fetching trends: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")


@router.get("/compare")
def compare_projects(
    project_ids: str,  # Comma-separated IDs
    days: Optional[int] = 30,
    db: Session = Depends(get_db)
):
    """
    Compare risk trends across multiple projects
    Example: /analytics/compare?project_ids=1,2,3&days=30
    """
    try:
        # Parse project IDs
        ids = [int(id.strip()) for id in project_ids.split(",")]
        
        if len(ids) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 projects for comparison")
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        comparison = []
        for pid in ids:
            project = db.query(ProjectRecord).filter(ProjectRecord.id == pid).first()
            if not project:
                continue
            
            history = db.query(RiskHistory).filter(
                RiskHistory.project_id == pid,
                RiskHistory.timestamp >= cutoff_date
            ).order_by(RiskHistory.timestamp.asc()).all()
            
            comparison.append({
                "project_id": pid,
                "project_name": project.name,
                "protocol_type": project.protocol_type,
                "current_risk": project.risk_score,
                "risk_level": project.risk_level,
                "history": [
                    {
                        "timestamp": h.timestamp.isoformat(),
                        "risk_score": h.risk_score
                    }
                    for h in history
                ]
            })
        
        return {
            "timeframe_days": days,
            "projects": comparison
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error comparing projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compare: {str(e)}")


@router.get("/alerts")
def get_risk_alerts(threshold: Optional[float] = 10.0, db: Session = Depends(get_db)):
    """
    Get alerts for projects with significant risk changes
    threshold: minimum percentage change to trigger alert
    """
    try:
        # Get recent changes (last 7 days)
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        projects = db.query(ProjectRecord).all()
        alerts = []
        
        for project in projects:
            history = db.query(RiskHistory).filter(
                RiskHistory.project_id == project.id,
                RiskHistory.timestamp >= cutoff_date
            ).order_by(RiskHistory.timestamp.asc()).all()
            
            if len(history) >= 2:
                old_risk = history[0].risk_score
                new_risk = history[-1].risk_score
                change_percent = ((new_risk - old_risk) / old_risk * 100) if old_risk > 0 else 0
                
                if abs(change_percent) >= threshold:
                    alerts.append({
                        "project_id": project.id,
                        "project_name": project.name,
                        "alert_type": "risk_increase" if change_percent > 0 else "risk_decrease",
                        "severity": "high" if abs(change_percent) >= 20 else "medium",
                        "old_risk": round(old_risk, 2),
                        "new_risk": round(new_risk, 2),
                        "change_percent": round(change_percent, 2),
                        "timestamp": history[-1].timestamp.isoformat()
                    })
        
        # Sort by severity and change
        alerts.sort(key=lambda x: abs(x["change_percent"]), reverse=True)
        
        return {
            "alert_count": len(alerts),
            "threshold_percent": threshold,
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"❌ Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Get overall analytics summary
    """
    try:
        # Total snapshots
        total_snapshots = db.query(func.count(RiskHistory.id)).scalar()
        
        # Projects with history
        projects_tracked = db.query(func.count(func.distinct(RiskHistory.project_id))).scalar()
        
        # Recent activity (last 24 hours)
        recent_cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_snapshots = db.query(func.count(RiskHistory.id)).filter(
            RiskHistory.timestamp >= recent_cutoff
        ).scalar()
        
        # Average risk across all current projects
        avg_risk = db.query(func.avg(ProjectRecord.risk_score)).scalar()
        
        return {
            "total_snapshots": total_snapshots or 0,
            "projects_tracked": projects_tracked or 0,
            "recent_snapshots_24h": recent_snapshots or 0,
            "average_risk": round(avg_risk, 2) if avg_risk else 0,
            "database_health": "healthy" if total_snapshots and total_snapshots > 0 else "no_data"
        }
    except Exception as e:
        logger.error(f"❌ Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")


@router.get("/test-defillama/{protocol_slug}")
def test_defillama_api(protocol_slug: str):
    """
    Test if DeFiLlama API is working for a specific protocol
    Examples: aave, uniswap, curve, lido, gmx, pendle
    """
    try:
        logger.info(f"🧪 Testing DeFiLlama API for: {protocol_slug}")
        
        # Test 1: Get protocol data
        data = defillama_service.get_protocol_data(protocol_slug, force_fresh=True)
        
        if not data:
            return {
                "status": "failed",
                "protocol": protocol_slug,
                "error": "No data returned from DeFiLlama",
                "suggestion": "Try protocols like: aave, uniswap, curve, lido, gmx, pendle"
            }
        
        # Test 2: Extract info
        info = defillama_service.extract_protocol_info(data)
        
        # Test 3: Get historical data
        historical = defillama_service.get_historical_tvl(protocol_slug, days=7)
        
        return {
            "status": "success",
            "protocol": protocol_slug,
            "timestamp": datetime.utcnow().isoformat(),
            "current_data": {
                "name": info["name"],
                "tvl": info["total_value_locked"],
                "liquidity_score": info["liquidity_score"],
                "user_activity_score": info["user_activity_score"],
                "audit_status": info["audit_status"],
                "chains": info.get("chains", [])
            },
            "historical_data_points": len(historical),
            "historical_sample": historical[-3:] if historical else [],
            "api_working": True
        }
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        logger.exception("Full traceback:")
        return {
            "status": "error",
            "protocol": protocol_slug,
            "error": str(e),
            "api_working": False
        }


@router.get("/refresh-all")
def refresh_all_projects_get(db: Session = Depends(get_db)):
    """
    GET version - Can be clicked in browser
    Manually trigger refresh of ALL projects with fresh DeFiLlama data
    """
    try:
        logger.info("🔄 Manual refresh triggered via GET!")
        
        projects = db.query(ProjectRecord).all()
        
        results = {
            "total_projects": len(projects),
            "timestamp": datetime.utcnow().isoformat(),
            "updates": []
        }
        
        for project in projects:
            try:
                protocol_slug = project.name.lower().replace(" ", "-")
                
                logger.info(f"\n🔍 Refreshing: {project.name}")
                
                # Store old values
                old_values = {
                    "tvl": float(project.total_value_locked),
                    "liquidity": float(project.liquidity_score),
                    "activity": float(project.user_activity_score),
                    "risk": float(project.risk_score)
                }
                
                # Fetch FRESH data
                fresh_data = defillama_service.get_protocol_data(protocol_slug, force_fresh=True)
                
                if not fresh_data:
                    results["updates"].append({
                        "name": project.name,
                        "status": "no_data",
                        "message": f"Could not fetch data from DeFiLlama for slug: {protocol_slug}"
                    })
                    continue
                
                # Extract fresh info
                protocol_info = defillama_service.extract_protocol_info(fresh_data)
                
                # Update project
                project.total_value_locked = protocol_info['total_value_locked']
                project.liquidity_score = protocol_info['liquidity_score']
                project.user_activity_score = protocol_info['user_activity_score']
                project.audit_status = protocol_info['audit_status']
                
                # Recalculate risk
                defi_project = DeFiProject(
                    name=project.name,
                    protocol_type=project.protocol_type,
                    total_value_locked=project.total_value_locked,
                    audit_status=project.audit_status,
                    liquidity_score=project.liquidity_score,
                    user_activity_score=project.user_activity_score
                )
                
                risk_result = calculate_risk(defi_project)
                project.risk_score = risk_result["overall_risk"]
                project.risk_level = risk_result["risk_level"]
                project.risk_breakdown = risk_result["risk_breakdown"]
                
                # Save snapshot
                history = RiskHistory(
                    project_id=project.id,
                    timestamp=datetime.utcnow(),
                    risk_score=project.risk_score,
                    risk_level=project.risk_level,
                    smart_contract_risk=risk_result["risk_breakdown"]["smart_contract_risk"],
                    liquidity_risk=risk_result["risk_breakdown"]["liquidity_risk"],
                    financial_risk=risk_result["risk_breakdown"]["financial_risk"],
                    operational_risk=risk_result["risk_breakdown"]["operational_risk"],
                    total_value_locked=project.total_value_locked,
                    liquidity_score=project.liquidity_score,
                    user_activity_score=project.user_activity_score,
                    audit_status=project.audit_status,
                    snapshot_type="manual_refresh"
                )
                
                db.add(history)
                
                # Calculate changes
                changes = {
                    "tvl": float(project.total_value_locked) - old_values["tvl"],
                    "liquidity": float(project.liquidity_score) - old_values["liquidity"],
                    "activity": float(project.user_activity_score) - old_values["activity"],
                    "risk": float(project.risk_score) - old_values["risk"]
                }
                
                results["updates"].append({
                    "name": project.name,
                    "status": "updated",
                    "old_values": old_values,
                    "new_values": {
                        "tvl": float(project.total_value_locked),
                        "liquidity": float(project.liquidity_score),
                        "activity": float(project.user_activity_score),
                        "risk": float(project.risk_score)
                    },
                    "changes": changes,
                    "data_changed": any(abs(v) > 0.01 for v in changes.values())
                })
                
                logger.info(f"✅ Updated {project.name}")
                
            except Exception as e:
                logger.error(f"❌ Error refreshing {project.name}: {e}")
                results["updates"].append({
                    "name": project.name,
                    "status": "error",
                    "error": str(e)
                })
        
        db.commit()
        
        # Summary
        updated = sum(1 for u in results["updates"] if u["status"] == "updated")
        changed = sum(1 for u in results["updates"] if u.get("data_changed"))
        
        results["summary"] = {
            "updated": updated,
            "data_actually_changed": changed,
            "no_data": sum(1 for u in results["updates"] if u["status"] == "no_data"),
            "errors": sum(1 for u in results["updates"] if u["status"] == "error")
        }
        
        return results
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Refresh failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))