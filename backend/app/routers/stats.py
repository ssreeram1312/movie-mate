from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Media

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/summary")
def get_stats_summary(db: Session = Depends(get_db)):
    all_media = db.query(Media).all()
    
    total_movies = 0
    total_shows = 0
    total_watch_time_minutes = 0
    genre_counts = {}
    total_rating = 0
    rated_items_count = 0
    
    for m in all_media:
        if m.media_type == "movie":
            total_movies += 1
            if m.status == "completed" and m.runtime_minutes:
                total_watch_time_minutes += m.runtime_minutes
        else:
            total_shows += 1
            if m.episodes_watched and m.runtime_minutes:
                total_watch_time_minutes += (m.episodes_watched * m.runtime_minutes)
                
        if m.genre:
            genres = [g.strip() for g in m.genre.split(",") if g.strip()]
            for g in genres:
                genre_counts[g] = genre_counts.get(g, 0) + 1
                
        if m.rating and m.rating > 0:
            total_rating += m.rating
            rated_items_count += 1
            
    top_genres = sorted([{"name": k, "count": v} for k, v in genre_counts.items()], key=lambda x: x["count"], reverse=True)[:5]
    
    avg_rating = round(total_rating / rated_items_count, 1) if rated_items_count > 0 else 0
    
    return {
        "total_movies": total_movies,
        "total_shows": total_shows,
        "total_watch_time_minutes": total_watch_time_minutes,
        "top_genres": top_genres,
        "average_rating": avg_rating,
        "total_collection": len(all_media)
    }
