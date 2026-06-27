"""
DeFiLlama API Integration Service
Fetches real-time protocol data from DeFiLlama
"""

import requests
from typing import Dict, List, Optional
import time
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeFiLlamaService:
    BASE_URL = "https://api.llama.fi"
    
    def __init__(self):
        self._protocols_cache = None
        self._cache_timestamp = 0
        # REDUCED cache to 5 minutes instead of 1 hour for more frequent updates
        self._cache_ttl = 300  # 5 minutes
        
        # Setup session with headers to avoid rate limiting
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def _get_all_protocols(self, force_refresh: bool = False) -> List[Dict]:
        """
        Fetch all protocols from DeFiLlama (with caching)
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
        """
        current_time = time.time()
        
        # Return cached data if still valid (unless force refresh)
        if not force_refresh and self._protocols_cache and (current_time - self._cache_timestamp) < self._cache_ttl:
            logger.info(f"📦 Using cached protocols ({len(self._protocols_cache)} protocols)")
            return self._protocols_cache
        
        try:
            logger.info("🌐 Fetching fresh protocols from DeFiLlama...")
            response = self.session.get(f"{self.BASE_URL}/protocols", timeout=15)
            response.raise_for_status()
            
            self._protocols_cache = response.json()
            self._cache_timestamp = current_time
            
            logger.info(f"✅ Fetched {len(self._protocols_cache)} protocols from DeFiLlama at {datetime.now()}")
            return self._protocols_cache
            
        except requests.exceptions.Timeout:
            logger.error("❌ Request timeout - DeFiLlama API is slow")
            return self._protocols_cache if self._protocols_cache else []
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error fetching protocols: {e}")
            return self._protocols_cache if self._protocols_cache else []
    
    def search_protocols(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Search protocols by name (case-insensitive)
        Returns top matches for autocomplete
        """
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
        Get detailed data for a specific protocol
        Args:
            protocol_slug: The protocol identifier (e.g., 'aave', 'uniswap')
            force_fresh: If True, always fetch fresh data (no cache)
        """
        try:
            logger.info(f"🔍 Fetching protocol data for: {protocol_slug}")
            
            # Always get fresh data for individual protocol requests
            response = self.session.get(
                f"{self.BASE_URL}/protocol/{protocol_slug}", 
                timeout=15,
                # Add cache-busting parameter
                params={'t': int(time.time())} if force_fresh else {}
            )
            
            logger.info(f"📡 Response status: {response.status_code}")
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"✅ Successfully fetched data for {protocol_slug} at {datetime.now()}")
            
            return data
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ HTTP Error for {protocol_slug}: {e}")
            
            # Fallback: search in cached list
            logger.info(f"🔄 Trying fallback: searching in cached protocols list...")
            protocols = self._get_all_protocols()
            for p in protocols:
                if p.get('slug', '').lower() == protocol_slug.lower():
                    logger.info(f"✅ Found {protocol_slug} in cached list")
                    return p
            
            logger.error(f"❌ Protocol {protocol_slug} not found in cache either")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error fetching protocol {protocol_slug}: {e}")
            return None
    
    def extract_protocol_info(self, protocol_data: Dict) -> Dict:
        """
        Extract relevant information from DeFiLlama protocol data
        Maps to our risk analysis format
        """
        # Get TVL (Total Value Locked)
        tvl = protocol_data.get('tvl', 0)
        if isinstance(tvl, list) and len(tvl) > 0:
            tvl = tvl[-1].get('totalLiquidityUSD', 0)
        
        # Get category (protocol type)
        category = protocol_data.get('category', 'Unknown')
        protocol_type = self._map_category_to_type(category)
        
        # Estimate audit status based on available data
        audit_status = self._estimate_audit_status(protocol_data)
        
        # Estimate liquidity score based on TVL and chains
        liquidity_score = self._estimate_liquidity_score(protocol_data)
        
        # Estimate user activity based on various factors
        user_activity_score = self._estimate_user_activity(protocol_data)
        
        return {
            "name": protocol_data.get('name', 'Unknown'),
            "protocol_type": protocol_type,
            "total_value_locked": float(tvl) if tvl else 0,
            "audit_status": audit_status,
            "liquidity_score": liquidity_score,
            "user_activity_score": user_activity_score,
            "logo": protocol_data.get('logo'),
            "url": protocol_data.get('url'),
            "description": protocol_data.get('description'),
            "chains": protocol_data.get('chains', []),
            "twitter": protocol_data.get('twitter'),
        }
    
    def _map_category_to_type(self, category: str) -> str:
        """Map DeFiLlama categories to our protocol types"""
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
        
        return 'DEX'  # Default fallback
    
    def _estimate_audit_status(self, protocol_data: Dict) -> str:
        """Estimate audit status based on available data"""
        audits = protocol_data.get('audits', 0)
        
        try:
            audit_count = int(audits) if audits else 0
        except:
            audit_count = 0
        
        audit_links = protocol_data.get('audit_links', [])
        
        if audit_count > 0 or (audit_links and len(audit_links) > 0):
            return "Audited"
        else:
            return "Unaudited"
    
    def _estimate_liquidity_score(self, protocol_data: Dict) -> float:
        """Estimate liquidity score (0-100) based on TVL and chains"""
        tvl = protocol_data.get('tvl', 0)
        if isinstance(tvl, list) and len(tvl) > 0:
            tvl = tvl[-1].get('totalLiquidityUSD', 0)
        
        chains = protocol_data.get('chains', [])
        num_chains = len(chains) if chains else 1
        
        if tvl > 1_000_000_000:
            base_score = 90
        elif tvl > 100_000_000:
            base_score = 80
        elif tvl > 10_000_000:
            base_score = 70
        elif tvl > 1_000_000:
            base_score = 60
        else:
            base_score = 50
        
        chain_bonus = min(10, num_chains * 2)
        
        return min(100, base_score + chain_bonus)
    
    def _estimate_user_activity(self, protocol_data: Dict) -> float:
        """Estimate user activity score (0-100) based on various factors"""
        score = 50
        
        tvl = protocol_data.get('tvl', 0)
        if isinstance(tvl, list) and len(tvl) > 0:
            tvl = tvl[-1].get('totalLiquidityUSD', 0)
        
        if tvl > 500_000_000:
            score += 25
        elif tvl > 50_000_000:
            score += 20
        elif tvl > 5_000_000:
            score += 15
        else:
            score += 10
        
        chains = protocol_data.get('chains', [])
        if len(chains) > 5:
            score += 15
        elif len(chains) > 2:
            score += 10
        else:
            score += 5
        
        if protocol_data.get('twitter'):
            score += 10
        
        return min(100, score)
    
    def get_historical_tvl(self, protocol_slug: str, days: int = 30) -> List[Dict]:
        """
        Get historical TVL data from DeFiLlama
        Returns daily TVL snapshots for the past N days
        
        FIXED: Now properly handles the TVL array structure
        """
        try:
            logger.info(f"🔍 Fetching historical TVL for: {protocol_slug} (last {days} days)")
            
            # Get fresh data
            response = self.session.get(
                f"{self.BASE_URL}/protocol/{protocol_slug}",
                timeout=15,
                params={'t': int(time.time())}  # Cache busting
            )
            
            logger.info(f"📡 DeFiLlama response status: {response.status_code}")
            
            if not response.ok:
                logger.warning(f"⚠️ Failed to fetch {protocol_slug}: HTTP {response.status_code}")
                logger.warning(f"Response: {response.text[:200]}")
                return []
            
            data = response.json()
            logger.info(f"📦 Received data keys: {list(data.keys())}")
            
            # DeFiLlama returns TVL in different formats depending on the endpoint
            tvl_history = []
            
            # Format 1: 'tvl' field with array of {date, totalLiquidityUSD}
            if 'tvl' in data and isinstance(data['tvl'], list):
                tvl_array = data['tvl']
                logger.info(f"📊 Found TVL array with {len(tvl_array)} entries")
                
                # Get last N days
                tvl_history = tvl_array[-days:] if len(tvl_array) > days else tvl_array
                
                result = [
                    {
                        'date': entry.get('date'),
                        'tvl': entry.get('totalLiquidityUSD', 0)
                    }
                    for entry in tvl_history
                    if 'date' in entry and 'totalLiquidityUSD' in entry
                ]
                
                logger.info(f"✅ Processed {len(result)} historical TVL data points")
                if result:
                    logger.info(f"📅 Date range: {result[0]['date']} to {result[-1]['date']}")
                    logger.info(f"💰 TVL range: ${result[0]['tvl']:,.0f} to ${result[-1]['tvl']:,.0f}")
                
                return result
            
            # Format 2: 'chainTvls' field (alternative structure)
            elif 'chainTvls' in data:
                logger.info("📊 Found chainTvls structure, extracting...")
                chain_tvls = data['chainTvls']
                
                # Usually has a main chain with historical data
                for chain_name, chain_data in chain_tvls.items():
                    if isinstance(chain_data, dict) and 'tvl' in chain_data:
                        tvl_array = chain_data['tvl']
                        if isinstance(tvl_array, list):
                            tvl_history = tvl_array[-days:] if len(tvl_array) > days else tvl_array
                            
                            result = [
                                {
                                    'date': entry.get('date'),
                                    'tvl': entry.get('totalLiquidityUSD', 0)
                                }
                                for entry in tvl_history
                                if 'date' in entry
                            ]
                            
                            if result:
                                logger.info(f"✅ Extracted {len(result)} data points from {chain_name}")
                                return result
            
            logger.warning(f"⚠️ No TVL history found in response for {protocol_slug}")
            logger.warning(f"Available keys: {list(data.keys())}")
            
            return []
            
        except requests.exceptions.Timeout:
            logger.error(f"❌ Timeout fetching historical TVL for {protocol_slug}")
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching historical TVL for {protocol_slug}: {e}")
            logger.exception("Full traceback:")
            return []


# Singleton instance
defillama_service = DeFiLlamaService()