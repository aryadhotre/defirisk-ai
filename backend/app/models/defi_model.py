# backend/app/models/defi_model.py
from pydantic import BaseModel
from typing import Optional


class DeFiProject(BaseModel):
    name: str
    protocol_type: str
    total_value_locked: float
    audit_status: str

    # New real-metric fields (all optional with neutral defaults so
    # manual entry and legacy callers still work without providing them)
    tvl_volatility: float = 0.0       # % coefficient of variation, 30d
    max_drawdown: float = 0.0         # % peak-to-trough drop, 30d
    change_1d: float = 0.0
    change_7d: float = 0.0
    change_30d: float = 0.0
    top_chain_share: float = 100.0    # % TVL on dominant chain
    chain_count: int = 1
    mcap_to_tvl: Optional[float] = None

    # Kept for backward compatibility with any old code paths / manual entry.
    # No longer used by the risk engine, but harmless to keep.
    liquidity_score: float = 0.0
    user_activity_score: float = 0.0