# backend/app/models/risk_history_model.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.db import Base


class RiskHistory(Base):
    """
    Historical risk tracking for protocols.
    v2: stores real signals (volatility, drawdown, concentration, momentum)
    so the frontend can plot WHY risk changed over time, not just the score.
    """
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)

    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Risk metrics at this point in time
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)

    # Risk breakdown snapshot
    smart_contract_risk = Column(Float, nullable=True)
    liquidity_risk = Column(Float, nullable=True)
    financial_risk = Column(Float, nullable=True)
    operational_risk = Column(Float, nullable=True)

    # Core protocol metric
    total_value_locked = Column(Float, nullable=False)
    audit_status = Column(String, nullable=False)

    # NEW real signals (nullable so old rows / partial data don't break)
    tvl_volatility = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    change_1d = Column(Float, nullable=True)
    change_7d = Column(Float, nullable=True)
    change_30d = Column(Float, nullable=True)
    top_chain_share = Column(Float, nullable=True)
    chain_count = Column(Integer, nullable=True)
    mcap_to_tvl = Column(Float, nullable=True)

    # Legacy columns — kept nullable so existing rows remain valid.
    # No longer written by the new scheduler, but not dropped to avoid
    # destructive migration on production data.
    liquidity_score = Column(Float, nullable=True)
    user_activity_score = Column(Float, nullable=True)

    snapshot_type = Column(String, default="manual")