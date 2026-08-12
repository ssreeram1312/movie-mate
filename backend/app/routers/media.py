from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from app.database import get_db
from app.models import Media
from app.schemas import (
    MediaCreate,
    MediaUpdate,
    MediaResponse,
    MediaListResponse,
    ProgressUpdate,
    RatingUpdate,
)

router = APIRouter(prefix="/media", tags=["Media"])


@router.get("", response_model=MediaListResponse)
def list_media(
    genre: str | None = Query(None, description="Filter by genre"),
    platform: str | None = Query(None, description="Filter by platform"),
    status: str | None = Query(None, description="Filter by status"),
    media_type: str | None = Query(None, description="Filter by type (movie/tv_show)"),
    search: str | None = Query(None, description="Search by title"),
    sort_by: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db),
):
    """List all media with optional filtering and sorting."""
    query = db.query(Media)

    # Apply filters
    if genre:
        query = query.filter(Media.genre.ilike(f"%{genre}%"))
    if platform:
        query = query.filter(Media.platform.ilike(f"%{platform}%"))
    if status:
        query = query.filter(Media.status == status)
    if media_type:
        query = query.filter(Media.media_type == media_type)
    if search:
        query = query.filter(Media.title.ilike(f"%{search}%"))

    # Apply sorting
    sort_column = getattr(Media, sort_by, Media.created_at)
    if order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    items = query.all()

    return MediaListResponse(items=items, total=total)


@router.post("", response_model=MediaResponse, status_code=201)
def create_media(media_data: MediaCreate, db: Session = Depends(get_db)):
    """Create a new media entry."""
    db_media = Media(**media_data.model_dump())
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


@router.get("/{media_id}", response_model=MediaResponse)
def get_media(media_id: int, db: Session = Depends(get_db)):
    """Get a single media entry by ID."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return media


@router.put("/{media_id}", response_model=MediaResponse)
def update_media(media_id: int, media_data: MediaUpdate, db: Session = Depends(get_db)):
    """Update a media entry."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    update_data = media_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(media, field, value)

    db.commit()
    db.refresh(media)
    return media


@router.delete("/{media_id}", status_code=204)
def delete_media(media_id: int, db: Session = Depends(get_db)):
    """Delete a media entry."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    db.delete(media)
    db.commit()
    return None


@router.put("/{media_id}/progress", response_model=MediaResponse)
def update_progress(media_id: int, progress: ProgressUpdate, db: Session = Depends(get_db)):
    """Update episode progress for a TV show."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.media_type != "tv_show":
        raise HTTPException(status_code=400, detail="Progress tracking is only for TV shows")

    media.episodes_watched = progress.episodes_watched

    # Auto-complete if all episodes watched
    if media.total_episodes and media.episodes_watched >= media.total_episodes:
        media.status = "completed"
        media.episodes_watched = media.total_episodes
    elif media.episodes_watched > 0 and media.status == "wishlist":
        media.status = "watching"

    db.commit()
    db.refresh(media)
    return media


@router.put("/{media_id}/rate", response_model=MediaResponse)
def rate_media(media_id: int, rating_data: RatingUpdate, db: Session = Depends(get_db)):
    """Rate and optionally review a media entry."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    media.rating = rating_data.rating
    if rating_data.review is not None:
        media.review = rating_data.review

    db.commit()
    db.refresh(media)
    return media
