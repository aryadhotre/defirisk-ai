# backend/app/models/project_model.py
from sqlalchemy import (
    Column, Integer, String, Float, JSON, ForeignKey, UniqueConstraint
)
from app.db import Base


class ProjectRecord(Base):
    __tablename__ = "projects"
    # name is no longer globally unique — it's unique PER USER.
    # Two different users can each track "Aave V3"; one user can't add it twice.
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_project_name"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # NEW — every project belongs to a user. nullable=False = no orphan rows.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String, nullable=False)  # was unique=True; now per-user via __table_args__
    protocol_type = Column(String, nullable=False)
    total_value_locked = Column(Float, nullable=False)
    audit_status = Column(String, nullable=False)

    risk_score = Column(Float, nullable=False)
    risk_breakdown = Column(JSON, nullable=True)
    risk_level = Column(String, nullable=True)

    # Signal columns
    tvl_volatility = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    change_1d = Column(Float, nullable=True)
    change_7d = Column(Float, nullable=True)
    change_30d = Column(Float, nullable=True)
    top_chain_share = Column(Float, nullable=True)
    chain_count = Column(Integer, nullable=True)
    top_chain = Column(String, nullable=True)
    mcap_to_tvl = Column(Float, nullable=True)

    # Legacy — nullable
    liquidity_score = Column(Float, nullable=True)
    user_activity_score = Column(Float, nullable=True)