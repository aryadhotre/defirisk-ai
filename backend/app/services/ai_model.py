import math

def ai_risk_model(tvl, liquidity, activity, audit_status):
    # Normalize values
    tvl_factor = math.log10(tvl + 1) / 10
    liquidity_factor = liquidity / 100
    activity_factor = activity / 100

    # Audited protocols are safer
    audit_factor = 0.1 if audit_status.lower() == "audited" else 0.3

    # Weighted scoring formula
    risk_score = (0.4 * (1 - liquidity_factor) +
                  0.3 * (1 - activity_factor) +
                  0.2 * audit_factor +
                  0.1 * (1 - tvl_factor))

    # Convert to 0–100 scale (higher = safer)
    final_score = round((1 - risk_score) * 100, 2)
    return final_score
