"""
DeFiLlama API Integration Service - v2
Now extracts real volatility, concentration, and momentum signals
instead of relying on TVL-tier lookup tables.
"""

import requests
from typing import Dict, List, Optional
import time
import statistics
import logging

logger = logging.getLogger(__name__)


class DeFiLlamaService:
    BASE_URL = "https://api.llama.fi"

    def __init__(self):
        self._protocols_cache = None
        self._cache_timestamp = 0
        self._cache_ttl = 300  # 5 minutes

        # NEW: per-protocol response cache. The old code re-fetched a
        # protocol's FULL historical TVL payload from DeFiLlama on every
        # single call — including twice in a row (dropdown preview, then
        # Analyze Risk seconds later). This cache means the second call
        # reuses the first response instead of paying that network cost again.
        self._protocol_data_cache: Dict[str, tuple] = {}  # slug -> (timestamp, data)
        self._protocol_cache_ttl = 90  # seconds — long enough to cover preview->analyze

        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    # ------------------------------------------------------------------
    # Existing methods (unchanged behavior)
    # ------------------------------------------------------------------

    def _get_all_protocols(self, force_refresh: bool = False) -> List[Dict]:
        current_time = time.time()

        if not force_refresh and self._protocols_cache and (current_time - self._cache_timestamp) < self._cache_ttl:
            return self._protocols_cache

        try:
            response = self.session.get(f"{self.BASE_URL}/protocols", timeout=15)
            response.raise_for_status()
            self._protocols_cache = response.json()
            self._cache_timestamp = current_time
            logger.info(f"✅ Fetched {len(self._protocols_cache)} protocols from DeFiLlama")
            return self._protocols_cache
        except Exception as e:
            logger.error(f"❌ Error fetching protocols: {e}")
            return self._protocols_cache if self._protocols_cache else []

    def search_protocols(self, query: str, limit: int = 10) -> List[Dict]:
        if not query or len(query) < 2:
            return []

        protocols = self._get_all_protocols()
        query_lower = query.lower()

        matches = []
        for p in protocols:
            name = p.get('name', '').lower()
            symbol = p.get('symbol', '').lower()

            if name == query_lower or symbol == query_lower:
                matches.insert(0, p)
            elif name.startswith(query_lower) or symbol.startswith(query_lower):
                matches.append(p)
            elif query_lower in name or query_lower in symbol:
                matches.append(p)

        return matches[:limit]

    def get_protocol_data(self, protocol_slug: str, force_fresh: bool = True) -> Optional[Dict]:
        """
        Fetch a single protocol's full data (including historical TVL —
        a genuinely large payload). Now cached per-slug for `_protocol_cache_ttl`
        seconds so back-to-back calls (preview, then analyze) reuse one fetch
        instead of hitting DeFiLlama twice.

        force_fresh=True bypasses the cache entirely and always hits the network
        (used by the manual /refresh-all endpoint, where staleness is unacceptable).
        """
        cache_key = protocol_slug.lower()
        now = time.time()

        if not force_fresh:
            cached = self._protocol_data_cache.get(cache_key)
            if cached and (now - cached[0]) < self._protocol_cache_ttl:
                logger.info(f"⚡ Cache hit for protocol '{protocol_slug}'")
                return cached[1]

        try:
            response = self.session.get(
                f"{self.BASE_URL}/protocol/{protocol_slug}",
                timeout=15,
                params={'t': int(now)} if force_fresh else {}
            )
            response.raise_for_status()
            data = response.json()
            self._protocol_data_cache[cache_key] = (now, data)
            return data
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ HTTP Error for {protocol_slug}: {e}")
            protocols = self._get_all_protocols()
            for p in protocols:
                if p.get('slug', '').lower() == protocol_slug.lower():
                    return p
            return None
        except Exception as e:
            logger.error(f"❌ Error fetching protocol {protocol_slug}: {e}")
            return None

    # ------------------------------------------------------------------
    # NEW: Real metric extraction
    # ------------------------------------------------------------------

    def _get_current_tvl(self, protocol_data: Dict) -> float:
        """Get the most recent TVL value, handling both list and scalar formats."""
        tvl = protocol_data.get('tvl', 0)
        if isinstance(tvl, list) and len(tvl) > 0:
            return float(tvl[-1].get('totalLiquidityUSD', 0))
        return float(tvl) if tvl else 0.0

    def _get_tvl_series(self, protocol_data: Dict, days: int = 30) -> List[float]:
        """
        Extract the last N days of TVL values as a plain list of numbers.
        Used for volatility, drawdown, and momentum calculations.
        """
        tvl = protocol_data.get('tvl', [])
        if not isinstance(tvl, list) or len(tvl) == 0:
            return []

        recent = tvl[-days:] if len(tvl) > days else tvl
        series = [
            float(entry.get('totalLiquidityUSD', 0))
            for entry in recent
            if entry.get('totalLiquidityUSD') is not None
        ]
        return [v for v in series if v > 0]

    def calculate_tvl_volatility(self, protocol_data: Dict, days: int = 30) -> float:
        """
        Coefficient of variation (std dev / mean) of daily TVL over the window,
        expressed as a percentage. Higher = more erratic/risky TVL behavior.
        Returns 0 if insufficient data.
        """
        series = self._get_tvl_series(protocol_data, days)
        if len(series) < 3:
            return 0.0

        mean_tvl = statistics.mean(series)
        if mean_tvl == 0:
            return 0.0

        stdev_tvl = statistics.pstdev(series)
        coefficient_of_variation = (stdev_tvl / mean_tvl) * 100
        return round(coefficient_of_variation, 2)

    def calculate_max_drawdown(self, protocol_data: Dict, days: int = 30) -> float:
        """
        Largest peak-to-trough percentage drop in TVL over the window.
        A real risk signal: protocols with deep drawdowns are riskier
        even if current TVL looks fine.
        Returns 0 if insufficient data.
        """
        series = self._get_tvl_series(protocol_data, days)
        if len(series) < 3:
            return 0.0

        peak = series[0]
        max_dd = 0.0
        for value in series:
            if value > peak:
                peak = value
            if peak > 0:
                drawdown = (peak - value) / peak * 100
                if drawdown > max_dd:
                    max_dd = drawdown

        return round(max_dd, 2)

    def calculate_momentum(self, protocol_data: Dict) -> Dict[str, float]:
        """
        TVL % change over 1, 7, and 30 day windows.
        Calculated directly from the tvl history array (not DeFiLlama's
        own change fields, which aren't always present on /protocol/{slug}).
        """
        series_30d = self._get_tvl_series(protocol_data, 30)

        result = {"change_1d": 0.0, "change_7d": 0.0, "change_30d": 0.0}

        if len(series_30d) < 2:
            return result

        current = series_30d[-1]

        def pct_change(past_value: float) -> float:
            if past_value == 0:
                return 0.0
            return round((current - past_value) / past_value * 100, 2)

        if len(series_30d) >= 2:
            result["change_1d"] = pct_change(series_30d[-2])
        if len(series_30d) >= 8:
            result["change_7d"] = pct_change(series_30d[-8])
        if len(series_30d) >= 30:
            result["change_30d"] = pct_change(series_30d[0])

        return result

    _NON_CHAIN_KEYS = {
        "borrowed", "staking", "pool2", "offers", "treasury", "vesting",
        "masterchef", "polynetwork", "ownTokens",
    }

    def calculate_chain_concentration(self, protocol_data: Dict) -> Dict:
        """
        How concentrated TVL is on a single chain.
        Returns the top chain's share of TVL (0-100) and chain count.

        Excludes DeFiLlama's synthetic keys (borrowed, staking, pool2, etc.)
        and any '-borrowed'/'-staking' suffixed variants, so only real
        blockchains are counted.
        """
        chain_tvls = protocol_data.get('chainTvls', {})

        chain_totals = {}
        for chain_name, chain_value in chain_tvls.items():
            # Skip synthetic accounting buckets
            if chain_name in self._NON_CHAIN_KEYS:
                continue
            # Skip suffixed variants like "Ethereum-borrowed", "Arbitrum-staking"
            if any(chain_name.endswith(f"-{suffix}") for suffix in self._NON_CHAIN_KEYS):
                continue

            if isinstance(chain_value, dict):
                tvl_list = chain_value.get('tvl', [])
                if isinstance(tvl_list, list) and tvl_list:
                    val = float(tvl_list[-1].get('totalLiquidityUSD', 0))
                    if val > 0:
                        chain_totals[chain_name] = val
            elif isinstance(chain_value, (int, float)):
                if float(chain_value) > 0:
                    chain_totals[chain_name] = float(chain_value)

        if not chain_totals:
            return {"top_chain_share": 100.0, "chain_count": 1, "top_chain": "Unknown"}

        total = sum(chain_totals.values())
        if total == 0:
            return {"top_chain_share": 100.0, "chain_count": len(chain_totals), "top_chain": "Unknown"}

        top_chain = max(chain_totals, key=chain_totals.get)
        top_share = round((chain_totals[top_chain] / total) * 100, 2)

        return {
            "top_chain_share": top_share,
            "chain_count": len(chain_totals),
            "top_chain": top_chain,
        }

    def calculate_mcap_to_tvl(self, protocol_data: Dict) -> Optional[float]:
        """
        Market cap / TVL ratio. A high ratio can indicate the token is
        priced well above the capital it secures (speculative froth);
        very low can indicate undervaluation or a non-tokenized protocol.
        Returns None if mcap data isn't available (many protocols lack a token).
        """
        mcap = protocol_data.get('mcap')
        tvl = self._get_current_tvl(protocol_data)

        if not mcap or tvl == 0:
            return None

        return round(mcap / tvl, 3)

    # ------------------------------------------------------------------
    # Updated extraction - now returns real metrics alongside basics
    # ------------------------------------------------------------------

    def extract_protocol_info(self, protocol_data: Dict) -> Dict:
        """
        Extract relevant information from DeFiLlama protocol data.
        v2: includes real volatility, drawdown, momentum, and concentration
        metrics instead of TVL-tier guesses.
        """
        tvl = self._get_current_tvl(protocol_data)
        category = protocol_data.get('category', 'Unknown')
        protocol_type = self._map_category_to_type(category)

        audit_status = self._estimate_audit_status(protocol_data)

        volatility = self.calculate_tvl_volatility(protocol_data)
        drawdown = self.calculate_max_drawdown(protocol_data)
        momentum = self.calculate_momentum(protocol_data)
        concentration = self.calculate_chain_concentration(protocol_data)
        mcap_tvl_ratio = self.calculate_mcap_to_tvl(protocol_data)

        return {
            "name": protocol_data.get('name', 'Unknown'),
            "protocol_type": protocol_type,
            "total_value_locked": tvl,
            "audit_status": audit_status,
            "logo": protocol_data.get('logo'),
            "url": protocol_data.get('url'),
            "description": protocol_data.get('description'),
            "chains": protocol_data.get('chains', []),
            "twitter": protocol_data.get('twitter'),

            # New real-metric fields
            "tvl_volatility": volatility,          # % coefficient of variation, 30d
            "max_drawdown": drawdown,                # % peak-to-trough drop, 30d
            "change_1d": momentum["change_1d"],
            "change_7d": momentum["change_7d"],
            "change_30d": momentum["change_30d"],
            "top_chain_share": concentration["top_chain_share"],  # % on dominant chain
            "chain_count": concentration["chain_count"],
            "top_chain": concentration["top_chain"],
            "mcap_to_tvl": mcap_tvl_ratio,            # None if no token
        }

    def _map_category_to_type(self, category: str) -> str:
        mapping = {
            'dexes': 'DEX',
            'dex': 'DEX',
            'lending': 'Lending',
            'derivatives': 'Derivatives',
            'yield': 'Yield',
            'staking': 'Staking',
            'options': 'Options',
            'farm': 'Yield',
            'liquid staking': 'Staking',
            'cdp': 'Lending',
        }
        category_lower = category.lower()
        for key, value in mapping.items():
            if key in category_lower:
                return value
        return 'DEX'

    def _estimate_audit_status(self, protocol_data: Dict) -> str:
        audits = protocol_data.get('audits', 0)
        try:
            audit_count = int(audits) if audits else 0
        except Exception:
            audit_count = 0
        audit_links = protocol_data.get('audit_links', [])
        if audit_count > 0 or (audit_links and len(audit_links) > 0):
            return "Audited"
        return "Unaudited"

    def get_historical_tvl(self, protocol_slug: str, days: int = 30) -> List[Dict]:
        """Unchanged from v1 - kept for backfill compatibility."""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/protocol/{protocol_slug}",
                timeout=15
            )
            if not response.ok:
                return []
            data = response.json()
            if 'tvl' in data and isinstance(data['tvl'], list):
                tvl_history = data['tvl'][-days:] if len(data['tvl']) > days else data['tvl']
                return [
                    {'date': entry.get('date'), 'tvl': entry.get('totalLiquidityUSD', 0)}
                    for entry in tvl_history
                ]
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching historical TVL for {protocol_slug}: {e}")
            return []


defillama_service = DeFiLlamaService()