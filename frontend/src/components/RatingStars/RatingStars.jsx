import { MdStar, MdStarBorder, MdStarHalf } from 'react-icons/md'
import './RatingStars.css'

export default function RatingStars({ rating, onRate, readonly = false }) {
  const stars = []
  
  // Rating is 0-10, we'll display 5 stars (each worth 2 points)
  const displayRating = (rating || 0) / 2

  for (let i = 1; i <= 5; i++) {
    const isFull = displayRating >= i
    const isHalf = !isFull && displayRating >= i - 0.5
    
    stars.push(
      <button
        key={i}
        type="button"
        className={`star-btn ${readonly ? 'readonly' : ''}`}
        onClick={() => !readonly && onRate(i * 2)}
        disabled={readonly}
        aria-label={`Rate ${i * 2} out of 10`}
        title={`Rate ${i * 2} out of 10`}
      >
        {isFull ? (
          <MdStar className="star-icon filled" />
        ) : isHalf ? (
          <MdStarHalf className="star-icon filled" />
        ) : (
          <MdStarBorder className="star-icon empty" />
        )}
      </button>
    )
  }

  return (
    <div className="rating-stars-wrap">
      <div className="rating-stars" role="radiogroup" aria-label="Rating">
        {stars}
      </div>
      {rating != null && (
        <span className="rating-value">{rating.toFixed(1)} / 10</span>
      )}
    </div>
  )
}
