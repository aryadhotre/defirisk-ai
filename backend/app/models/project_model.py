# backend/app/models/project_model.py
from sqlalchemy import Column, Integer, String, Float, JSON
from app.db import Base

class ProjectRecord(Base):
    """
    Database model for DeFi projects with comprehensive risk tracking
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    protocol_type = Column(String, nullable=False)
    total_value_locked = Column(Float, nullable=False)
    audit_status = Column(String, nullable=False)
    liquidity_score = Column(Float, nullable=False)
    user_activity_score = Column(Float, nullable=False)
    
    # Overall risk score
    risk_score = Column(Float, nullable=False)
    
    # Risk breakdown (stored as JSON)
    # Contains: smart_contract_risk, liquidity_risk, financial_risk, operational_risk
    risk_breakdown = Column(JSON, nullable=True)
    
    # Risk level category: Low, Medium, High, Critical
    risk_level = Column(String, nullable=True)