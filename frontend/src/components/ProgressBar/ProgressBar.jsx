import { MdAdd, MdRemove } from 'react-icons/md'
import './ProgressBar.css'

export default function ProgressBar({ watched, total, onUpdate, loading = false }) {
  const progress = total ? Math.min(Math.round((watched / total) * 100), 100) : 0
  const isCompleted = watched >= total

  const handleIncrement = () => {
    if (!loading && watched < total) {
      onUpdate(watched + 1)
    }
  }

  const handleDecrement = () => {
    if (!loading && watched > 0) {
      onUpdate(watched - 1)
    }
  }

  return (
    <div className="progress-bar-wrap">
      <div className="progress-header">
        <span className="progress-label">Episodes Watched</span>
        <span className="progress-text">
          {watched} <span className="progress-text-muted">/ {total}</span>
        </span>
      </div>

      <div className="progress-track-container">
        <button
          className="btn-icon progress-btn"
          onClick={handleDecrement}
          disabled={loading || watched === 0}
          aria-label="Decrease episodes watched"
        >
          <MdRemove size={16} />
        </button>

        <div className="progress-track">
          <div
            className={`progress-fill ${isCompleted ? 'completed' : ''}`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <button
          className="btn-icon progress-btn"
          onClick={handleIncrement}
          disabled={loading || isCompleted}
          aria-label="Increase episodes watched"
        >
          <MdAdd size={16} />
        </button>
      </div>

      {isCompleted && (
        <p className="progress-complete-msg">🎉 You've finished this show!</p>
      )}
    </div>
  )
}
