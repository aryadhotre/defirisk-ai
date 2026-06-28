# backend/app/services/scheduler.py
"""
Background scheduler - v2
Fetches fresh data, computes risk from REAL metrics, stores rich snapshots.
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_scheduler_started = False


def _build_defi_project(project: ProjectRecord, info: dict) -> DeFiProject:
    """Construct a DeFiProject carrying the new metrics from extracted info."""
    return DeFiProject(
        name=project.name,
        protocol_type=project.protocol_type,
        total_value_locked=info.get("total_value_locked", project.total_value_locked),
        audit_status=info.get("audit_status", project.audit_status),
        tvl_volatility=info.get("tvl_volatility", 0.0),
        max_drawdown=info.get("max_drawdown", 0.0),
        change_1d=info.get("change_1d", 0.0),
        change_7d=info.get("change_7d", 0.0),
        change_30d=info.get("change_30d", 0.0),
        top_chain_share=info.get("top_chain_share", 100.0),
        chain_count=info.get("chain_count", 1),
        mcap_to_tvl=info.get("mcap_to_tvl", None),
    )


def analyze_all_projects_daily():
    logger.info(f"\n{'='*70}")
    logger.info(f"⏰ Analysis Job Started - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"{'='*70}")

    db: Session = SessionLocal()

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
                fresh_data = defillama_service.get_protocol_data(protocol_slug, force_fresh=True)

                if fresh_data:
                    info = defillama_service.extract_protocol_info(fresh_data)
                    old_tvl = project.total_value_locked

                    # Update core fields on the project record
                    project.total_value_locked = info["total_value_locked"]
                    project.audit_status = info["audit_status"]

                    if old_tvl != project.total_value_locked:
                        logger.info(f"💰 TVL: ${old_tvl:,.0f} → ${project.total_value_locked:,.0f}")
                        updated_count += 1
                    else:
                        logger.info(f"💰 TVL Unchanged: ${project.total_value_locked:,.0f}")

                    logger.info(
                        f"📈 vol={info['tvl_volatility']}% "
                        f"dd={info['max_drawdown']}% "
                        f"7d={info['change_7d']}% "
                        f"chains={info['chain_count']} "
                        f"topShare={info['top_chain_share']}%"
                    )
                else:
                    logger.warning(f"⚠️ No fresh data for {project.name}; using stored values")
                    info = {
                        "total_value_locked": project.total_value_locked,
                        "audit_status": project.audit_status,
                        "tvl_volatility": 0.0, "max_drawdown": 0.0,
                        "change_1d": 0.0, "change_7d": 0.0, "change_30d": 0.0,
                        "top_chain_share": 100.0, "chain_count": 1, "mcap_to_tvl": None,
                    }

                # Compute risk from the new metrics
                defi_project = _build_defi_project(project, info)
                result = calculate_risk(defi_project)

                project.risk_score = result["overall_risk"]
                project.risk_level = result["risk_level"]
                project.risk_breakdown = result["risk_breakdown"]

                # Persist a rich historical snapshot
                history = RiskHistory(
                    project_id=project.id,
                    timestamp=datetime.utcnow(),
                    risk_score=result["overall_risk"],
                    risk_level=result["risk_level"],
                    smart_contract_risk=result["risk_breakdown"]["smart_contract_risk"],
                    liquidity_risk=result["risk_breakdown"]["liquidity_risk"],
                    financial_risk=result["risk_breakdown"]["financial_risk"],
                    operational_risk=result["risk_breakdown"]["operational_risk"],
                    total_value_locked=project.total_value_locked,
                    audit_status=project.audit_status,
                    tvl_volatility=info["tvl_volatility"],
                    max_drawdown=info["max_drawdown"],
                    change_1d=info["change_1d"],
                    change_7d=info["change_7d"],
                    change_30d=info["change_30d"],
                    top_chain_share=info["top_chain_share"],
                    chain_count=info["chain_count"],
                    mcap_to_tvl=info["mcap_to_tvl"],
                    snapshot_type="auto_6h",
                )
                db.add(history)
                success_count += 1
                logger.info(f"✅ Snapshot saved: {project.name} (Risk: {result['overall_risk']})")

            except Exception as e:
                logger.error(f"❌ Error analyzing {project.name}: {e}")
                error_count += 1
                continue

        db.commit()

        logger.info(f"\n{'='*70}")
        logger.info(f"🎉 Analysis Complete! Success: {success_count}/{len(projects)}, "
                    f"Updated: {updated_count}, Errors: {error_count}")
        logger.info(f"⏰ Next run in 6 hours")
        logger.info(f"{'='*70}\n")

    except Exception as e:
        logger.error(f"❌ Analysis job failed: {e}")
        db.rollback()
    finally:
        db.close()


jobstores = {'default': MemoryJobStore()}
scheduler = BackgroundScheduler(jobstores=jobstores)


def start_scheduler():
    global _scheduler_started
    if _scheduler_started:
        logger.info("📅 Scheduler already running, skipping")
        return
    try:
        if not scheduler.get_jobs():
            scheduler.add_job(
                analyze_all_projects_daily,
                'interval',
                hours=6,
                id='periodic_risk_analysis',
                replace_existing=True,
                next_run_time=datetime.now()
            )
            logger.info("📅 Scheduled job added: Every 6 hours")
        if not scheduler.running:
            scheduler.start()
            _scheduler_started = True
            logger.info("✅ Scheduler started successfully")
            logger.info(f"⏰ Next run: {datetime.now() + timedelta(hours=6):%Y-%m-%d %H:%M:%S}")
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")


def stop_scheduler():
    global _scheduler_started
    if scheduler.running:
        scheduler.shutdown(wait=False)
        _scheduler_started = False
        logger.info("📅 Scheduler stopped")