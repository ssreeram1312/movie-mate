from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Media
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])

class ReviewRequest(BaseModel):
    title: str
    genre: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None

@router.get("/recommendations")
async def get_recommendations(db: Session = Depends(get_db)):
    """Generate recommendations based on user's current collection."""
    # Get recent or highly rated items to send to the AI
    media_list = db.query(Media).order_by(Media.rating.desc(), Media.created_at.desc()).limit(15).all()
    
    if not media_list:
        return {"recommendations": []}
        
    try:
        recommendations = await ai_service.generate_recommendations(media_list)
        return {"recommendations": recommendations}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

@router.post("/generate-review")
async def generate_review(request: ReviewRequest):
    """Generate a review using Gemini based on title, notes, and rating."""
    try:
        review = await ai_service.generate_review(
            title=request.title,
            genre=request.genre,
            rating=request.rating,
            notes=request.notes
        )
        return {"review": review}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate review")
