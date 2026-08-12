from fastapi import APIRouter, Query, HTTPException
from app.services.tmdb_service import tmdb_service

router = APIRouter(prefix="/tmdb", tags=["TMDB"])

@router.get("/search")
async def search_tmdb(
    q: str = Query(..., min_length=2, description="Search query"),
    type: str = Query("multi", pattern="^(movie|tv|multi)$", description="Media type")
):
    """Proxy search requests to TMDB API."""
    try:
        return await tmdb_service.search(q, type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/details/{tmdb_id}")
async def get_tmdb_details(
    tmdb_id: int,
    type: str = Query("movie", pattern="^(movie|tv)$", description="Media type")
):
    """Fetch full details for a TMDB item to auto-fill form."""
    try:
        return await tmdb_service.get_details(tmdb_id, type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
