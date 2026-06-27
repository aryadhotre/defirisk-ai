# backend/app/services/historical_backfill.py
"""
Historical data backfill using real DeFiLlama TVL data
Estimates historical risk scores based on actual TVL changes
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.project_model import ProjectRecord
from app.models.risk_history_model import RiskHistory
from app.services.defillama_service import defillama_service
from app.models.defi_model import DeFiProject
from app.services.risk_analyzer import calculate_risk


def backfill_project_history(project: ProjectRecord, protocol_slug: str, days: int, db: Session) -> int:
    """
    Backfill historical risk data for a single project using real TVL data
    
    Args:
        project: ProjectRecord from database
        protocol_slug: DeFiLlama protocol slug
        days: Number of days to backfill
        db: Database session
    
    Returns:
        Number of historical entries created
    """
    print(f"📊 Backfilling {days} days of history for {project.name} using real TVL data")
    
    # Get historical TVL from DeFiLlama
    historical_tvl = defillama_service.get_historical_tvl(protocol_slug, days)
    
    if not historical_tvl:
        print(f"⚠️ No historical TVL data available for {project.name}")
        return 0
    
    entries_created = 0
    
    for tvl_entry in historical_tvl:
        # Convert Unix timestamp to datetime
        timestamp = datetime.fromtimestamp(tvl_entry['date'])
        tvl = tvl_entry['tvl']
        
        # Check if we already have data for this date
        existing = db.query(RiskHistory).filter(
            RiskHistory.project_id == project.id,
            RiskHistory.timestamp >= timestamp,
            RiskHistory.timestamp < timestamp + timedelta(days=1)
        ).first()
        
        if existing:
            continue  # Skip if already exists
        
        # Create a temporary DeFiProject object with historical TVL
        temp_project = DeFiProject(
            name=project.name,
            protocol_type=project.protocol_type,
            total_value_locked=tvl,
            audit_status=project.audit_status,
            liquidity_score=project.liquidity_score,
            user_activity_score=project.user_activity_score
        )
        
        # Calculate risk score with historical TVL
        risk_result = calculate_risk(temp_project)
        
        # Create history entry
        history = RiskHistory(
            project_id=project.id,
            timestamp=timestamp,
            risk_score=risk_result["overall_risk"],
            risk_level=risk_result["risk_level"],
            smart_contract_risk=risk_result["risk_breakdown"]["smart_contract_risk"],
            liquidity_risk=risk_result["risk_breakdown"]["liquidity_risk"],
            financial_risk=risk_result["risk_breakdown"]["financial_risk"],
            operational_risk=risk_result["risk_breakdown"]["operational_risk"],
            total_value_locked=tvl,
            liquidity_score=project.liquidity_score,
            user_activity_score=project.user_activity_score,
            audit_status=project.audit_status,
            snapshot_type="historical_backfill"
        )
        
        db.add(history)
        entries_created += 1
    
    db.commit()
    print(f"✅ Created {entries_created} historical entries for {project.name}")
    
    return entries_created


def backfill_all_projects(days: int, db: Session) -> dict:
    """
    Backfill historical data for all projects in database
    
    Args:
        days: Number of days to backfill
        db: Database session
    
    Returns:
        Dictionary with backfill results
    """
    projects = db.query(ProjectRecord).all()
    
    if not projects:
        return {"error": "No projects found", "total": 0}
    
    results = {
        "total_projects": len(projects),
        "total_entries": 0,
        "successful": [],
        "failed": []
    }
    
    for project in projects:
        try:
            # Try to find the protocol slug (simplified name)
            protocol_slug = project.name.lower().replace(" ", "-")
            
            entries = backfill_project_history(project, protocol_slug, days, db)
            
            results["total_entries"] += entries
            results["successful"].append({
                "name": project.name,
                "entries": entries
            })
            
        except Exception as e:
            print(f"❌ Error backfilling {project.name}: {e}")
            results["failed"].append({
                "name": project.name,
                "error": str(e)
            })
    
    return results