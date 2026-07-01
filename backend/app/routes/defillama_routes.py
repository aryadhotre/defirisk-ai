# backend/app/routes/defillama_routes.py
from fastapi import APIRouter, HTTPException
from app.services.defillama_service import defillama_service

router = APIRouter()


@router.get("/search")
def search_protocols(q: str, limit: int = 10):
    """
    Search for DeFi protocols by name
    Used for autocomplete in frontend
    
    Example: GET /defillama/search?q=uni&limit=5
    """
    if not q or len(q) < 2:
        return {"results": [], "message": "Query must be at least 2 characters"}
    
    try:
        results = defillama_service.search_protocols(q, limit)
        
        # Return simplified data for autocomplete
        simplified = [
            {
                "name": p.get('name'),
                "slug": p.get('slug'),
                "symbol": p.get('symbol'),
                "category": p.get('category'),
                "tvl": p.get('tvl'),
                "logo": p.get('logo'),
            }
            for p in results
        ]
        
        return {"results": simplified, "count": len(simplified)}
    except Exception as e:
        print(f"❌ Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/protocol/{protocol_slug}")
def get_protocol(protocol_slug: str):
    """
    Get detailed protocol data from DeFiLlama
    Returns data formatted for our risk analysis

    Example: GET /defillama/protocol/uniswap

    CHANGED: force_fresh=False — this is the dropdown-preview call. It now
    shares the service's 90s per-protocol cache with /defi/analyze_risk,
    so clicking a search result and then hitting "Analyze Risk" seconds
    later reuses the same DeFiLlama fetch instead of paying for it twice.
    """
    try:
        # Fetch protocol data (cached if fetched recently)
        protocol_data = defillama_service.get_protocol_data(protocol_slug, force_fresh=False)
        
        if not protocol_data:
            raise HTTPException(status_code=404, detail="Protocol not found")
        
        # Extract and format data
        formatted_data = defillama_service.extract_protocol_info(protocol_data)
        
        return {
            "success": True,
            "data": formatted_data,
            "source": "DeFiLlama",
            "message": "Protocol data fetched successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching protocol: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch protocol: {str(e)}")


@router.get("/protocols/popular")
def get_popular_protocols(limit: int = 20):
    """
    Get most popular protocols by TVL
    """
    try:
        protocols = defillama_service._get_all_protocols()
        
        # Sort by TVL
        sorted_protocols = sorted(
            protocols,
            key=lambda p: p.get('tvl', 0) if isinstance(p.get('tvl'), (int, float)) else 0,
            reverse=True
        )
        
        # Return top N
        popular = [
            {
                "name": p.get('name'),
                "slug": p.get('slug'),
                "category": p.get('category'),
                "tvl": p.get('tvl'),
                "logo": p.get('logo'),
                "chains": p.get('chains', [])
            }
            for p in sorted_protocols[:limit]
        ]
        
        return {"protocols": popular, "count": len(popular)}
    except Exception as e:
        print(f"❌ Error fetching popular protocols: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch protocols")