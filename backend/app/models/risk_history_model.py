# backend/app/models/risk_history_model.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from datetime import datetime
from app.db import Base

class RiskHistory(Base):
    """
    Historical risk tracking for protocols
    Stores snapshots of risk scores over time
    """
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Risk metrics at this point in time
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    
    # Risk breakdown snapshot
    smart_contract_risk = Column(Float, nullable=True)
    liquidity_risk = Column(Float, nullable=True)
    financial_risk = Column(Float, nullable=True)
    operational_risk = Column(Float, nullable=True)
    
    # Protocol metrics at this time
    total_value_locked = Column(Float, nullable=False)
    liquidity_score = Column(Float, nullable=False)
    user_activity_score = Column(Float, nullable=False)
    audit_status = Column(String, nullable=False)
    
    # Optional: What triggered this snapshot
    snapshot_type = Column(String, default="manual")  # manual, scheduled, alert, update