import { Link } from 'react-router-dom'
import { MdStar, MdPlayArrow, MdCheckCircle, MdBookmark, MdTv, MdMovie } from 'react-icons/md'
import './MediaCard.css'

const STATUS_CONFIG = {
  watching: { label: 'Watching', icon: MdPlayArrow, className: 'badge-watching' },
  completed: { label: 'Completed', icon: MdCheckCircle, className: 'badge-completed' },
  wishlist: { label: 'Wishlist', icon: MdBookmark, className: 'badge-wishlist' },
}

const PLACEHOLDER_COLORS = [
  '#7c5dfa', '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
]

function getPlaceholderColor(title) {
  const idx = (title?.charCodeAt(0) || 0) % PLACEHOLDER_COLORS.length
  return PLACEHOLDER_COLORS[idx]
}

export default function MediaCard({ media, index = 0 }) {
  const status = STATUS_CONFIG[media.status] || STATUS_CONFIG.wishlist
  const StatusIcon = status.icon
  const TypeIcon = media.media_type === 'tv_show' ? MdTv : MdMovie
  const placeholderColor = getPlaceholderColor(media.title)

  const progress =
    media.media_type === 'tv_show' && media.total_episodes
      ? Math.round((media.episodes_watched / media.total_episodes) * 100)
      : null

  return (
    <Link
      to={`/media/${media.id}`}
      className={`media-card glass-card animate-fade-in stagger-${Math.min(index + 1, 6)}`}
      aria-label={`${media.title} — ${status.label}`}
      id={`media-card-${media.id}`}
    >
      {/* Poster */}
      <div className="media-card-poster">
        {media.poster_url ? (
          <img
            src={media.poster_url}
            alt={`${media.title} poster`}
            className="media-card-img"
            loading="lazy"
          />
        ) : (
          <div
            className="media-card-placeholder"
            style={{ background: `linear-gradient(135deg, ${placeholderColor}33, ${placeholderColor}11)` }}
            aria-hidden="true"
          >
            <TypeIcon size={40} style={{ color: placeholderColor, opacity: 0.6 }} />
            <span className="media-card-placeholder-title">{media.title?.charAt(0)}</span>
          </div>
        )}

        {/* Status badge overlay */}
        <div className={`badge media-card-status-badge ${status.className}`}>
          <StatusIcon size={10} />
          {status.label}
        </div>

        {/* Type indicator */}
        <div className="media-card-type-badge" aria-label={media.media_type === 'tv_show' ? 'TV Show' : 'Movie'}>
          <TypeIcon size={12} />
        </div>
      </div>

      {/* Info */}
      <div className="media-card-info">
        <h3 className="media-card-title">{media.title}</h3>

        <div className="media-card-meta">
          {media.release_year && (
            <span className="media-card-year">{media.release_year}</span>
          )}
          {media.genre && (
            <span className="media-card-genre">{media.genre.split(',')[0].trim()}</span>
          )}
        </div>

        {/* Platform */}
        {media.platform && (
          <span className="platform-badge media-card-platform">
            {media.platform}
          </span>
        )}

        {/* Rating */}
        {media.rating != null && (
          <div className="media-card-rating">
            <MdStar className="media-card-star" aria-hidden="true" />
            <span>{media.rating.toFixed(1)}</span>
          </div>
        )}

        {/* TV show progress bar */}
        {progress !== null && (
          <div className="media-card-progress" aria-label={`${progress}% watched`}>
            <div className="media-card-progress-bar">
              <div
                className="media-card-progress-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="media-card-progress-text">
              {media.episodes_watched}/{media.total_episodes} eps
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
