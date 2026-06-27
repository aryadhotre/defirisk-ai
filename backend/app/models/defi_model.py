from pydantic import BaseModel

class DeFiProject(BaseModel):
    name: str
    protocol_type: str
    total_value_locked: float
    audit_status: str
    liquidity_score: float
    user_activity_score: float
