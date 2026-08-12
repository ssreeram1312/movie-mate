from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base


class Media(Base):
    """Model for movies and TV shows in the user's collection."""

    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    media_type = Column(String(20), nullable=False)  # "movie" or "tv_show"
    director = Column(String(255), nullable=True)
    genre = Column(String(255), nullable=True)  # Comma-separated: "Action, Sci-Fi"
    platform = Column(String(100), nullable=True)  # Netflix, Prime, Disney+, etc.
    status = Column(String(20), nullable=False, default="wishlist")  # watching, completed, wishlist

    # TV Show progress
    total_episodes = Column(Integer, nullable=True)
    episodes_watched = Column(Integer, default=0)

    # Rating & Review
    rating = Column(Float, nullable=True)  # 0-10 scale
    review = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)  # Personal notes (used for AI review generation)

    # TMDB data
    poster_url = Column(String(500), nullable=True)
    backdrop_url = Column(String(500), nullable=True)
    tmdb_id = Column(Integer, nullable=True, index=True)
    release_year = Column(Integer, nullable=True)
    runtime_minutes = Column(Integer, nullable=True)  # Per episode for TV, total for movies
    overview = Column(Text, nullable=True)  # TMDB description

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    watch_sessions = relationship("WatchSession", back_populates="media", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Media(id={self.id}, title='{self.title}', type='{self.media_type}')>"


class WatchSession(Base):
    """Model for tracking individual watch sessions (for stats & graphs)."""

    __tablename__ = "watch_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    media_id = Column(Integer, ForeignKey("media.id", ondelete="CASCADE"), nullable=False)
    watched_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=0)
    episodes_count = Column(Integer, default=1)

    # Relationships
    media = relationship("Media", back_populates="watch_sessions")

    def __repr__(self):
        return f"<WatchSession(id={self.id}, media_id={self.media_id}, date={self.watched_date})>"
