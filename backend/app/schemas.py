from datetime import datetime, date
from pydantic import BaseModel, Field


# ─── Media Schemas ────────────────────────────────────────────────────────────


class MediaBase(BaseModel):
    """Base schema with shared fields for creating/updating media."""

    title: str = Field(..., min_length=1, max_length=255)
    media_type: str = Field(..., pattern="^(movie|tv_show)$")
    director: str | None = None
    genre: str | None = None
    platform: str | None = None
    status: str = Field(default="wishlist", pattern="^(watching|completed|wishlist)$")
    total_episodes: int | None = None
    episodes_watched: int = 0
    rating: float | None = Field(default=None, ge=0, le=10)
    review: str | None = None
    notes: str | None = None
    poster_url: str | None = None
    backdrop_url: str | None = None
    tmdb_id: int | None = None
    release_year: int | None = None
    runtime_minutes: int | None = None
    overview: str | None = None


class MediaCreate(MediaBase):
    """Schema for creating a new media entry."""
    pass


class MediaUpdate(BaseModel):
    """Schema for updating a media entry. All fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    media_type: str | None = Field(default=None, pattern="^(movie|tv_show)$")
    director: str | None = None
    genre: str | None = None
    platform: str | None = None
    status: str | None = Field(default=None, pattern="^(watching|completed|wishlist)$")
    total_episodes: int | None = None
    episodes_watched: int | None = None
    rating: float | None = Field(default=None, ge=0, le=10)
    review: str | None = None
    notes: str | None = None
    poster_url: str | None = None
    backdrop_url: str | None = None
    tmdb_id: int | None = None
    release_year: int | None = None
    runtime_minutes: int | None = None
    overview: str | None = None


class MediaResponse(MediaBase):
    """Schema for media in API responses."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MediaListResponse(BaseModel):
    """Schema for paginated media list."""

    items: list[MediaResponse]
    total: int


# ─── Progress Schemas ─────────────────────────────────────────────────────────


class ProgressUpdate(BaseModel):
    """Schema for updating episode progress."""

    episodes_watched: int = Field(..., ge=0)


# ─── Rating Schemas ──────────────────────────────────────────────────────────


class RatingUpdate(BaseModel):
    """Schema for rating and reviewing."""

    rating: float = Field(..., ge=0, le=10)
    review: str | None = None


# ─── Watch Session Schemas ───────────────────────────────────────────────────


class WatchSessionCreate(BaseModel):
    """Schema for logging a watch session."""

    media_id: int
    watched_date: date
    duration_minutes: int = Field(..., ge=0)
    episodes_count: int = Field(default=1, ge=0)


class WatchSessionResponse(WatchSessionCreate):
    """Schema for watch session in API responses."""

    id: int

    model_config = {"from_attributes": True}


# ─── Health Check ────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    version: str
