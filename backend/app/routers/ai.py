from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any

from app.database import get_db
from app.models import Media
from app.services.ai_service import ai_service
from app.limiter import limiter

router = APIRouter(prefix="/ai", tags=["AI"])

class ReviewRequest(BaseModel):
    title: str
    genre: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None

class RecommendationsRequest(BaseModel):
    mode: str = "collection" # "collection", "quiz", "custom"
    data: Optional[Any] = None

class WatchPartyRequest(BaseModel):
    duration_minutes: int
    type: str
    mood: str
    pacing: str

@router.post("/recommendations")
@limiter.limit("10/minute")
async def get_recommendations(request: Request, rec_request: RecommendationsRequest, db: Session = Depends(get_db)):
    """Generate advanced recommendations based on mode."""
    # Get recent or highly rated items to send to the AI
    media_list = db.query(Media).order_by(Media.rating.desc(), Media.created_at.desc()).limit(15).all()
    
    if rec_request.mode == "collection" and not media_list:
        return {"recommendations": []}
        
    try:
        recommendations = await ai_service.generate_advanced_recommendations(rec_request.mode, rec_request.data, media_list)
        return {"recommendations": recommendations}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

@router.post("/watch-party")
@limiter.limit("5/minute")
async def watch_party_recommendations(request: Request, wp_request: WatchPartyRequest, db: Session = Depends(get_db)):
    """Generate time-constrained recommendations for a watch party."""
    media_list = db.query(Media).order_by(Media.rating.desc(), Media.created_at.desc()).limit(15).all()
    try:
        recommendations = await ai_service.generate_watch_party_recommendations(
            wp_request.duration_minutes,
            wp_request.type,
            wp_request.mood,
            wp_request.pacing,
            media_list
        )
        return {"recommendations": recommendations}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate watch party recommendations")

@router.post("/generate-review")
@limiter.limit("10/minute")
async def generate_review(request: Request, review_request: ReviewRequest):
    """Generate a review using Gemini based on title, notes, and rating."""
    try:
        review = await ai_service.generate_review(
            title=review_request.title,
            genre=review_request.genre,
            rating=review_request.rating,
            notes=review_request.notes
        )
        return {"review": review}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate review")
