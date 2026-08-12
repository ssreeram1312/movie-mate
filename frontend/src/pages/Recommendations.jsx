import { useState, useEffect } from 'react'
import { MdAutoAwesome, MdMovie, MdTv, MdArrowForward } from 'react-icons/md'
import { aiAPI } from '../services/api'
import './Recommendations.css'

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRecs = async () => {
      setLoading(true)
      try {
        const res = await aiAPI.getRecommendations()
        setRecommendations(res.data.recommendations || [])
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to get recommendations. Make sure your Gemini API key is set in the backend.')
      } finally {
        setLoading(false)
      }
    }
    fetchRecs()
  }, [])

  return (
    <div className="page-container recommendations-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <MdAutoAwesome style={{ color: 'var(--accent-primary)', marginRight: '8px' }} />
            AI Picks
          </h1>
          <p className="page-subtitle">Personalized recommendations powered by Gemini AI</p>
        </div>
      </div>

      {loading ? (
        <div className="recs-loading">
          <div className="skeleton recs-card-skeleton" />
          <div className="skeleton recs-card-skeleton" />
          <div className="skeleton recs-card-skeleton" />
        </div>
      ) : error ? (
        <div className="recs-empty">
          <MdAutoAwesome size={48} className="recs-empty-icon" />
          <h2>AI Error</h2>
          <p>{error}</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="recs-empty">
          <MdAutoAwesome size={48} className="recs-empty-icon" />
          <h2>Not enough data</h2>
          <p>Add and rate a few movies or shows in your collection first, so I can learn what you like!</p>
        </div>
      ) : (
        <div className="recs-grid">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="rec-card glass-card">
              <div className="rec-card-header">
                {rec.type === 'tv_show' ? <MdTv className="rec-type-icon" /> : <MdMovie className="rec-type-icon" />}
                <h3 className="rec-title">{rec.title}</h3>
              </div>
              <p className="rec-reason">{rec.reason}</p>
              
              {/* Optional: Add a quick button to search and add it directly */}
              <div className="rec-actions">
                <a href={`/add?q=${encodeURIComponent(rec.title)}`} className="btn btn-ghost btn-sm rec-btn">
                  Add to Collection <MdArrowForward size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
