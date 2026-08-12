import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MdArrowBack, MdEdit, MdDelete, MdCheckCircle,
  MdPlayArrow, MdBookmark, MdAccessTime, MdCalendarToday,
  MdMovie, MdTv, MdAutoAwesome
} from 'react-icons/md'
import { mediaAPI, aiAPI } from '../services/api'
import ProgressBar from '../components/ProgressBar/ProgressBar'
import RatingStars from '../components/RatingStars/RatingStars'
import './MediaDetail.css'

const STATUS_CONFIG = {
  watching: { label: 'Watching', icon: MdPlayArrow, className: 'badge-watching' },
  completed: { label: 'Completed', icon: MdCheckCircle, className: 'badge-completed' },
  wishlist: { label: 'Wishlist', icon: MdBookmark, className: 'badge-wishlist' },
}

export default function MediaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [media, setMedia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Review state
  const [review, setReview] = useState('')
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [generatingReview, setGeneratingReview] = useState(false)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await mediaAPI.get(id)
      setMedia(res.data)
      setReview(res.data.review || '')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load media details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this from your collection?')) return
    setDeleting(true)
    try {
      await mediaAPI.delete(id)
      navigate('/', { replace: true })
    } catch (err) {
      alert('Failed to delete media.')
      setDeleting(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try {
      const res = await mediaAPI.update(id, { status: newStatus })
      setMedia(res.data)
    } catch (err) {
      alert('Failed to update status.')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateProgress = async (newEpisodes) => {
    setUpdating(true)
    try {
      const res = await mediaAPI.updateProgress(id, newEpisodes)
      setMedia(res.data)
    } catch (err) {
      alert('Failed to update progress.')
    } finally {
      setUpdating(false)
    }
  }

  const handleRate = async (newRating) => {
    setUpdating(true)
    try {
      const res = await mediaAPI.rate(id, newRating, review)
      setMedia(res.data)
    } catch (err) {
      alert('Failed to save rating.')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveReview = async () => {
    setUpdating(true)
    try {
      const res = await mediaAPI.rate(id, media.rating || 0, review)
      setMedia(res.data)
      setIsEditingReview(false)
    } catch (err) {
      alert('Failed to save review.')
    } finally {
      setUpdating(false)
    }
  }

  const handleGenerateReview = async () => {
    setGeneratingReview(true)
    try {
      const res = await aiAPI.generateReview({
        title: media.title,
        genre: media.genre,
        rating: media.rating,
        notes: media.notes
      })
      setReview(res.data.review)
      setIsEditingReview(true)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate review. Check Gemini API key.')
    } finally {
      setGeneratingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container detail-loading">
        <div className="skeleton" style={{ width: 120, height: 24, marginBottom: 32 }} />
        <div className="detail-layout">
          <div className="skeleton detail-poster" />
          <div className="detail-info-skeleton">
            <div className="skeleton" style={{ width: '80%', height: 48, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: '40%', height: 24, marginBottom: 32 }} />
            <div className="skeleton" style={{ width: '100%', height: 120 }} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !media) {
    return (
      <div className="page-container detail-error">
        <h2>Oops!</h2>
        <p>{error || 'Media not found'}</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    )
  }

  const status = STATUS_CONFIG[media.status] || STATUS_CONFIG.wishlist
  const StatusIcon = status.icon
  const isTVShow = media.media_type === 'tv_show'

  // Completion Estimate Logic
  let completionEstimate = null
  if (isTVShow && media.total_episodes && media.runtime_minutes && media.episodes_watched < media.total_episodes) {
    const remainingEps = media.total_episodes - media.episodes_watched
    const remainingMins = remainingEps * media.runtime_minutes
    const hours = Math.floor(remainingMins / 60)
    const mins = remainingMins % 60
    completionEstimate = `~${hours}h ${mins > 0 ? `${mins}m` : ''} left`
  }

  return (
    <div className="page-container media-detail animate-fade-in">
      
      {/* Top Bar */}
      <div className="detail-topbar">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <MdArrowBack size={20} />
        </button>
        <div className="detail-actions">
          <button className="btn btn-secondary btn-icon" onClick={() => navigate(`/edit/${id}`)} title="Edit Media">
            <MdEdit size={20} />
          </button>
          <button className="btn btn-danger btn-icon" onClick={handleDelete} disabled={deleting} title="Delete">
            <MdDelete size={20} />
          </button>
        </div>
      </div>

      <div className="detail-layout">
        {/* Left Column: Poster & Status */}
        <div className="detail-left">
          <div className="detail-poster-wrap glass-card">
            {media.poster_url ? (
              <img src={media.poster_url} alt={`${media.title} poster`} className="detail-poster-img" />
            ) : (
              <div className="detail-poster-placeholder">
                {isTVShow ? <MdTv size={64} /> : <MdMovie size={64} />}
                <span>No Poster Available</span>
              </div>
            )}
            <div className={`badge detail-status-badge ${status.className} interactive-badge`}>
              <StatusIcon size={14} />
              <select
                className="status-select-dropdown"
                value={media.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                title="Change status"
              >
                <option value="wishlist">Wishlist</option>
                <option value="watching">Watching</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Info, Progress, Rating */}
        <div className="detail-right">
          
          <h1 className="detail-title">{media.title}</h1>
          
          <div className="detail-meta">
            {media.release_year && (
              <span className="detail-meta-item"><MdCalendarToday size={14} /> {media.release_year}</span>
            )}
            {media.runtime_minutes && (
              <span className="detail-meta-item">
                <MdAccessTime size={14} /> {media.runtime_minutes} min {isTVShow && 'per ep'}
              </span>
            )}
            {media.genre && <span className="detail-genre">{media.genre}</span>}
            {media.platform && <span className="platform-badge">{media.platform}</span>}
          </div>

          {media.director && (
            <p className="detail-director">Directed by <strong>{media.director}</strong></p>
          )}

          {media.overview && (
            <div className="detail-section">
              <h3>Overview</h3>
              <p className="detail-overview">{media.overview}</p>
            </div>
          )}

          {/* Interactive Sections */}
          <div className="detail-interactive-grid">
            
            {/* TV Show Progress */}
            {isTVShow && media.total_episodes && (
              <div className="detail-section glass-card detail-card">
                <h3>Watch Progress</h3>
                <ProgressBar
                  watched={media.episodes_watched}
                  total={media.total_episodes}
                  onUpdate={handleUpdateProgress}
                  loading={updating}
                />
                {completionEstimate && (
                  <p style={{ marginTop: '8px', fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                    {completionEstimate}
                  </p>
                )}
              </div>
            )}

            {/* Your Rating */}
            <div className="detail-section glass-card detail-card">
              <h3>Your Rating</h3>
              <div className="detail-rating-wrap">
                <RatingStars
                  rating={media.rating}
                  onRate={handleRate}
                  readonly={updating}
                />
                {!media.rating && <span className="detail-rating-hint">Click to rate</span>}
              </div>
            </div>

          </div>

          {/* Review Section */}
          <div className="detail-section glass-card detail-card detail-review-card">
            <div className="detail-review-header">
              <h3>Your Review</h3>
              {!isEditingReview && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleGenerateReview}
                    disabled={generatingReview}
                    title="Generate review using AI based on your notes and rating"
                  >
                    <MdAutoAwesome style={{ color: 'var(--accent-primary)' }} size={14} /> 
                    {generatingReview ? 'Generating...' : 'AI Review'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsEditingReview(true)}
                  >
                    <MdEdit size={14} /> {media.review ? 'Edit' : 'Write'}
                  </button>
                </div>
              )}
            </div>

            {isEditingReview ? (
              <div className="detail-review-editor">
                <textarea
                  className="textarea"
                  placeholder="What did you think of it?"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={4}
                />
                <div className="detail-review-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setReview(media.review || ''); setIsEditingReview(false) }}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveReview}
                    disabled={updating}
                  >
                    {updating ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-review-content">
                {media.review ? (
                  <p>{media.review}</p>
                ) : (
                  <p className="detail-empty-text">No review written yet.</p>
                )}
              </div>
            )}
          </div>
          
          {/* Notes display if exist */}
          {media.notes && (
            <div className="detail-section">
              <h3>Personal Notes</h3>
              <p className="detail-notes">{media.notes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
