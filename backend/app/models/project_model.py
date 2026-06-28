# backend/app/models/project_model.py
from sqlalchemy import Column, Integer, String, Float, JSON
from app.db import Base


class ProjectRecord(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    protocol_type = Column(String, nullable=False)
    total_value_locked = Column(Float, nullable=False)
    audit_status = Column(String, nullable=False)

    risk_score = Column(Float, nullable=False)
    risk_breakdown = Column(JSON, nullable=True)
    risk_level = Column(String, nullable=True)

    # NEW signal columns — THESE must be present
    tvl_volatility = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    change_1d = Column(Float, nullable=True)
    change_7d = Column(Float, nullable=True)
    change_30d = Column(Float, nullable=True)
    top_chain_share = Column(Float, nullable=True)
    chain_count = Column(Integer, nullable=True)
    top_chain = Column(String, nullable=True)
    mcap_to_tvl = Column(Float, nullable=True)

    # Legacy — now nullable
    liquidity_score = Column(Float, nullable=True)
    user_activity_score = Column(Float, nullable=True)