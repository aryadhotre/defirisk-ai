# backend/app/services/scheduler.py
"""
Background scheduler with persistence
Handles uvicorn reloads gracefully
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.project_model import ProjectRecord
from app.models.risk_history_model import RiskHistory
from app.models.defi_model import DeFiProject
from app.services.risk_analyzer import calculate_risk
from app.services.defillama_service import defillama_service
from app.db import SessionLocal
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global flag to prevent multiple scheduler instances
_scheduler_started = False


def analyze_all_projects_daily():
    """
    Fetches fresh data from DeFiLlama and creates snapshots
    """
    logger.info(f"\n{'='*70}")
    logger.info(f"⏰ Analysis Job Started - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"{'='*70}")
    
    db = SessionLocal()
    
    try:
        projects = db.query(ProjectRecord).all()
        
        if not projects:
            logger.warning("⚠️ No projects to analyze")
            return
        
        logger.info(f"📊 Found {len(projects)} projects to analyze")
        
        success_count = 0
        updated_count = 0
        error_count = 0
        
        for project in projects:
            try:
                logger.info(f"\n{'─'*50}")
                logger.info(f"🔍 Processing: {project.name}")
                
                protocol_slug = project.name.lower().replace(" ", "-")
                logger.info(f"🌐 Fetching FRESH data: {protocol_slug}")
                
                # Fetch fresh data
                fresh_data = defillama_service.get_protocol_data(protocol_slug, force_fresh=True)
                
                if fresh_data:
                    protocol_info = defillama_service.extract_protocol_info(fresh_data)
                    
                    old_tvl = project.total_value_locked
                    
                    # Update project
                    project.total_value_locked = protocol_info['total_value_locked']
                    project.liquidity_score = protocol_info['liquidity_score']
                    project.user_activity_score = protocol_info['user_activity_score']
                    project.audit_status = protocol_info['audit_status']
                    
                    if old_tvl != project.total_value_locked:
                        logger.info(f"💰 TVL Updated: ${old_tvl:,.0f} → ${project.total_value_locked:,.0f}")
                        updated_count += 1
                    else:
                        logger.info(f"💰 TVL Unchanged: ${project.total_value_locked:,.0f}")
                else:
                    logger.warning(f"⚠️ Could not fetch fresh data for {project.name}")
                
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
                    risk_score=risk_result["overall_risk"],
                    risk_level=risk_result["risk_level"],
                    smart_contract_risk=risk_result["risk_breakdown"]["smart_contract_risk"],
                    liquidity_risk=risk_result["risk_breakdown"]["liquidity_risk"],
                    financial_risk=risk_result["risk_breakdown"]["financial_risk"],
                    operational_risk=risk_result["risk_breakdown"]["operational_risk"],
                    total_value_locked=project.total_value_locked,
                    liquidity_score=project.liquidity_score,
                    user_activity_score=project.user_activity_score,
                    audit_status=project.audit_status,
                    snapshot_type="auto_6h"
                )
                
                db.add(history)
                success_count += 1
                
                logger.info(f"✅ Snapshot saved: {project.name} (Risk: {risk_result['overall_risk']:.1f})")
                
            except Exception as e:
                logger.error(f"❌ Error analyzing {project.name}: {e}")
                error_count += 1
                continue
        
        db.commit()
        
        logger.info(f"\n{'='*70}")
        logger.info(f"🎉 Analysis Complete!")
        logger.info(f"✅ Success: {success_count}/{len(projects)}")
        logger.info(f"🔄 Updated: {updated_count} projects")
        if error_count > 0:
            logger.info(f"❌ Errors: {error_count}")
        logger.info(f"⏰ Next run in 6 hours")
        logger.info(f"{'='*70}\n")
        
    except Exception as e:
        logger.error(f"❌ Analysis job failed: {e}")
        db.rollback()
    finally:
        db.close()


# Initialize scheduler with job store
jobstores = {
    'default': MemoryJobStore()
}

scheduler = BackgroundScheduler(jobstores=jobstores)


def start_scheduler():
    """
    Start the background scheduler
    Handles multiple starts gracefully (e.g., from uvicorn reload)
    """
    global _scheduler_started
    
    # Prevent multiple scheduler instances
    if _scheduler_started:
        logger.info("📅 Scheduler already running, skipping start")
        return
    
    try:
        # Check if there are any existing jobs
        existing_jobs = scheduler.get_jobs()
        if not existing_jobs:
            # Add the periodic job
            scheduler.add_job(
                analyze_all_projects_daily,
                'interval',
                hours=6,
                id='periodic_risk_analysis',
                replace_existing=True,
                next_run_time=datetime.now()  # Run immediately on start
            )
            logger.info("📅 Scheduled job added: Every 6 hours")
        
        # Start scheduler if not running
        if not scheduler.running:
            scheduler.start()
            _scheduler_started = True
            logger.info("✅ Scheduler started successfully")
            logger.info("🔄 Updates every 6 hours")
            logger.info(f"⏰ Next run: {datetime.now() + timedelta(hours=6):%Y-%m-%d %H:%M:%S}")
        else:
            logger.info("📅 Scheduler already running")
            
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")


def stop_scheduler():
    """Stop the scheduler gracefully"""
    global _scheduler_started
    
    if scheduler.running:
        scheduler.shutdown(wait=False)
        _scheduler_started = False
        logger.info("📅 Scheduler stopped")