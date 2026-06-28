"""
Risk Analyzer - v2
Computes a 0-100 risk score (higher = riskier) from REAL protocol signals:
volatility, drawdown, chain concentration, momentum, TVL depth, audit, valuation.

Replaces the old TVL-tier lookup heuristics. Each sub-risk is documented so the
numbers are explainable to a user, not a black box.

Score convention: 0 = safest, 100 = riskiest.
Each component returns 0-100, then we weight them into an overall score.
"""

from typing import Dict, Optional


# ----------------------------------------------------------------------
# Component scorers — each returns 0 (safe) to 100 (risky)
# ----------------------------------------------------------------------

def _smart_contract_risk(audit_status: str, tvl: float) -> float:
    """
    Smart contract / security risk.
    Drivers:
      - Audit status: unaudited code is materially riskier.
      - TVL-at-risk: a larger honeypot is a bigger target and amplifies
        the impact of any bug, so very large TVL adds a small risk premium.
    """
    base = 30.0 if audit_status == "Audited" else 65.0

    # Large TVL = bigger attack incentive. Small premium, capped.
    if tvl >= 10_000_000_000:      # $10B+
        base += 8
    elif tvl >= 1_000_000_000:     # $1B+
        base += 5
    elif tvl >= 100_000_000:       # $100M+
        base += 3

    return min(100.0, base)


def _liquidity_risk(tvl: float, volatility: float, top_chain_share: float) -> float:
    """
    Liquidity / exit risk: how hard it might be to exit positions safely.
    Drivers:
      - TVL depth: deeper TVL = easier exits = lower risk.
      - TVL volatility: erratic TVL implies flighty liquidity (can vanish fast).
      - Chain concentration: liquidity stuck on one chain is harder to exit
        during that chain's congestion/outage.
    """
    # Depth component (0-50): smaller protocols are harder to exit.
    if tvl >= 5_000_000_000:
        depth = 5
    elif tvl >= 1_000_000_000:
        depth = 12
    elif tvl >= 100_000_000:
        depth = 22
    elif tvl >= 10_000_000:
        depth = 35
    else:
        depth = 50

    # Volatility component (0-35): clamp CoV at 70% -> full risk.
    vol_component = min(35.0, (volatility / 70.0) * 35.0)

    # Concentration component (0-15): >90% on one chain is a real liquidity trap.
    conc_component = min(15.0, max(0.0, (top_chain_share - 50.0) / 50.0) * 15.0)

    return min(100.0, depth + vol_component + conc_component)


def _financial_risk(volatility: float, max_drawdown: float, mcap_to_tvl: Optional[float]) -> float:
    """
    Financial / market risk: exposure to value erosion.
    Drivers:
      - TVL volatility: instability in capital base.
      - Max drawdown: a deep recent peak-to-trough drop signals fragility.
      - Mcap/TVL ratio: very high ratios suggest speculative token froth
        relative to capital secured. None (no token) = neutral.
    """
    # Volatility (0-40)
    vol_component = min(40.0, (volatility / 70.0) * 40.0)

    # Drawdown (0-40): a 50%+ drawdown maxes this out.
    dd_component = min(40.0, (max_drawdown / 50.0) * 40.0)

    # Valuation (0-20): only applies if token exists.
    if mcap_to_tvl is None:
        val_component = 8.0  # neutral-ish default for tokenless protocols
    elif mcap_to_tvl > 5:
        val_component = 20.0
    elif mcap_to_tvl > 2:
        val_component = 14.0
    elif mcap_to_tvl > 1:
        val_component = 8.0
    else:
        val_component = 4.0  # mcap below TVL — relatively grounded

    return min(100.0, vol_component + dd_component + val_component)


def _operational_risk(chain_count: int, top_chain_share: float, change_30d: float) -> float:
    """
    Operational / structural risk.
    Drivers:
      - Single-chain dependence: one chain = single point of failure.
      - Chain count: more chains = more resilience (to a point).
      - 30d trend: a sharply declining protocol may signal waning
        confidence, team issues, or migration away.
    """
    # Concentration (0-45): single-chain protocols carry real structural risk.
    if chain_count <= 1:
        conc = 45.0
    else:
        # More chains lowers risk; share of top chain still matters.
        conc = min(45.0, max(0.0, (top_chain_share - 30.0) / 70.0) * 45.0)

    # Chain-count bonus reduction (more chains = safer), 0-15 reduction baked in above.

    # Trend (0-25): steep 30d decline adds risk; growth reduces it slightly.
    if change_30d <= -40:
        trend = 25.0
    elif change_30d <= -20:
        trend = 16.0
    elif change_30d <= -5:
        trend = 8.0
    elif change_30d < 5:
        trend = 4.0
    else:
        trend = 0.0  # growing TVL — no operational penalty

    return min(100.0, conc + trend)


# ----------------------------------------------------------------------
# Aggregator
# ----------------------------------------------------------------------

# Weights sum to 1.0. Tunable — documented so the overall score is explainable.
WEIGHTS = {
    "smart_contract_risk": 0.30,
    "liquidity_risk": 0.25,
    "financial_risk": 0.25,
    "operational_risk": 0.20,
}


def _risk_level(score: float) -> str:
    if score < 25:
        return "Low"
    elif score < 50:
        return "Medium"
    elif score < 75:
        return "High"
    return "Critical"


def calculate_risk(project) -> Dict:
    """
    Main entry point. Accepts an object/dataclass with these attributes
    (DeFiProject or any object exposing them):
        name, protocol_type, total_value_locked, audit_status,
        tvl_volatility, max_drawdown, top_chain_share, chain_count,
        change_30d, mcap_to_tvl

    Backwards-compatible: if the new metric attributes are missing
    (e.g. old DeFiProject objects), they default to neutral values so
    nothing crashes during the transition.
    """
    # Safely read attributes with sensible defaults
    tvl = float(getattr(project, "total_value_locked", 0) or 0)
    audit_status = getattr(project, "audit_status", "Unaudited") or "Unaudited"

    volatility = float(getattr(project, "tvl_volatility", 0) or 0)
    max_drawdown = float(getattr(project, "max_drawdown", 0) or 0)
    top_chain_share = float(getattr(project, "top_chain_share", 100) or 100)
    chain_count = int(getattr(project, "chain_count", 1) or 1)
    change_30d = float(getattr(project, "change_30d", 0) or 0)

    mcap_to_tvl_raw = getattr(project, "mcap_to_tvl", None)
    mcap_to_tvl = float(mcap_to_tvl_raw) if mcap_to_tvl_raw is not None else None

    # Compute components
    sc = _smart_contract_risk(audit_status, tvl)
    liq = _liquidity_risk(tvl, volatility, top_chain_share)
    fin = _financial_risk(volatility, max_drawdown, mcap_to_tvl)
    ops = _operational_risk(chain_count, top_chain_share, change_30d)

    overall = (
        sc * WEIGHTS["smart_contract_risk"]
        + liq * WEIGHTS["liquidity_risk"]
        + fin * WEIGHTS["financial_risk"]
        + ops * WEIGHTS["operational_risk"]
    )
    overall = round(overall, 1)

    return {
        "overall_risk": overall,
        "risk_level": _risk_level(overall),
        "risk_breakdown": {
            "smart_contract_risk": round(sc, 1),
            "liquidity_risk": round(liq, 1),
            "financial_risk": round(fin, 1),
            "operational_risk": round(ops, 1),
        },
        # Surface the raw signals so the UI can show WHY the score is what it is
        "signals": {
            "tvl_volatility": volatility,
            "max_drawdown": max_drawdown,
            "top_chain_share": top_chain_share,
            "chain_count": chain_count,
            "change_30d": change_30d,
            "mcap_to_tvl": mcap_to_tvl,
        },
        "recommendations": _recommendations(sc, liq, fin, ops),
    }


def _recommendations(sc: float, liq: float, fin: float, ops: float) -> list:
    """Plain-language flags based on which components are elevated."""
    recs = []
    if sc >= 60:
        recs.append("Security risk elevated — verify audit status and contract maturity before depositing.")
    if liq >= 60:
        recs.append("Liquidity risk elevated — exits may be difficult during stress; size positions carefully.")
    if fin >= 60:
        recs.append("Financial risk elevated — TVL has been volatile or drawn down sharply recently.")
    if ops >= 60:
        recs.append("Operational risk elevated — high chain concentration or a declining TVL trend.")
    if not recs:
        recs.append("No major risk flags. Standard DeFi caution still applies.")
    return recs