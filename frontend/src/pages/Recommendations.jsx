import { useState, useEffect } from 'react'
import { MdAutoAwesome, MdMovie, MdTv, MdArrowForward, MdSearch, MdQuestionAnswer, MdList, MdCalendarToday, MdAccessTime } from 'react-icons/md'
import { aiAPI, mediaAPI } from '../services/api'
import './Recommendations.css'

const QUIZ_QUESTIONS = [
  { id: 'mood', question: "What's your current mood?", options: ['Happy & Light', 'Dark & Gritty', 'Mind-bending', 'Thrilling', 'Relaxed'] },
  { id: 'pacing', question: "What kind of pacing do you prefer?", options: ['Fast & Action-packed', 'Slow burn & Character driven', 'Balanced'] },
  { id: 'format', question: "Movie or TV Show?", options: ['Movie', 'TV Show', 'Surprise me!'] }
];

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [hasCollection, setHasCollection] = useState(true)
  const [mode, setMode] = useState('collection') // collection, quiz, custom
  
  const [customPrompt, setCustomPrompt] = useState('')
  const [quizStep, setQuizStep] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})

  // Check if collection has items on mount
  useEffect(() => {
    mediaAPI.list({ limit: 1 }).then(res => {
      if (res.data.total === 0) {
        setHasCollection(false)
        setMode('quiz')
      } else {
        setHasCollection(true)
        // Auto-fetch collection recs if they have items
        if (recommendations.length === 0) {
          fetchRecs('collection')
        }
      }
    }).catch(err => console.error(err))
  }, [])

  const fetchRecs = async (fetchMode = mode, data = null) => {
    setLoading(true)
    setError(null)
    setRecommendations([])
    
    try {
      const payload = { mode: fetchMode, data: data }
      const res = await aiAPI.getRecommendations(payload)
      const recs = res.data.recommendations || []
      
      // If collection mode returned empty, it means collection is actually empty
      if (fetchMode === 'collection' && recs.length === 0) {
        setHasCollection(false)
        setMode('quiz')
      } else {
        setRecommendations(recs)
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError("You've requested too many AI picks! Please wait a minute before trying again.")
      } else {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to get recommendations.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleQuizAnswer = (answer) => {
    const q = QUIZ_QUESTIONS[quizStep];
    const newAnswers = { ...quizAnswers, [q.id]: answer };
    setQuizAnswers(newAnswers);
    
    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setQuizStep(prev => prev + 1)
    } else {
      // Quiz finished
      fetchRecs('quiz', newAnswers)
    }
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!customPrompt.trim()) return
    fetchRecs('custom', customPrompt)
  }

  const renderEmptyState = () => (
    <div className="recs-empty-state glass-card animate-fade-in">
      <MdAutoAwesome size={64} className="recs-empty-icon" />
      <h2>Your Collection is Empty</h2>
      <p>Start tracking movies and shows, or use our AI Quiz to find something amazing to watch right now!</p>
      <div className="recs-empty-actions">
        <button className="btn btn-primary" onClick={() => { setMode('quiz'); setQuizStep(0); setQuizAnswers({}); }}>Take AI Quiz</button>
        <button className="btn btn-secondary" onClick={() => { setMode('custom'); setCustomPrompt(''); }}>Custom Request</button>
      </div>
    </div>
  )

  const renderQuiz = () => {
    if (loading) return null; // hide quiz while loading
    if (recommendations.length > 0) return null; // hide quiz when results show
    
    const q = QUIZ_QUESTIONS[quizStep];
    return (
      <div className="recs-quiz-card glass-card animate-fade-in">
        <div className="quiz-progress">Question {quizStep + 1} of {QUIZ_QUESTIONS.length}</div>
        <h3 className="quiz-question">{q.question}</h3>
        <div className="quiz-options">
          {q.options.map(opt => (
            <button key={opt} className="btn btn-outline quiz-opt-btn" onClick={() => handleQuizAnswer(opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderCustom = () => {
    if (loading || recommendations.length > 0) return null;
    return (
      <div className="recs-custom-card glass-card animate-fade-in">
        <h3>Ask MovieMate AI</h3>
        <p>Tell me exactly what you're looking for...</p>
        <form onSubmit={handleCustomSubmit} className="recs-custom-form">
          <textarea
            className="textarea"
            placeholder="e.g., 'I want to watch a sci-fi movie like Interstellar but with more action'"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
          />
          <button type="submit" className="btn-glow" disabled={!customPrompt.trim()}>
            <div className="btn-glow-content">
              <MdAutoAwesome size={18} /> Generate Picks
            </div>
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="page-container recommendations-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <MdAutoAwesome style={{ color: 'var(--accent-primary)', marginRight: '8px' }} />
            AI Picks
          </h1>
          <p className="page-subtitle">Intelligent recommendations powered by Gemini & TMDB</p>
        </div>
      </div>

      {/* Mode Selector */}
      {hasCollection && !loading && (
        <div className="recs-mode-selector">
          <button className={`mode-btn ${mode === 'collection' ? 'active' : ''}`} onClick={() => { setMode('collection'); setRecommendations([]); fetchRecs('collection'); }}>
            <MdList size={18} /> Based on Collection
          </button>
          <button className={`mode-btn ${mode === 'quiz' ? 'active' : ''}`} onClick={() => { setMode('quiz'); setRecommendations([]); setQuizStep(0); setQuizAnswers({}); }}>
            <MdQuestionAnswer size={18} /> Take Quiz
          </button>
          <button className={`mode-btn ${mode === 'custom' ? 'active' : ''}`} onClick={() => { setMode('custom'); setRecommendations([]); setCustomPrompt(''); }}>
            <MdSearch size={18} /> Ask AI directly
          </button>
        </div>
      )}

      {/* States */}
      {!hasCollection && recommendations.length === 0 && !loading && mode === 'collection' && renderEmptyState()}
      
      {mode === 'quiz' && renderQuiz()}
      {mode === 'custom' && renderCustom()}

      {/* Loading State */}
      {loading && (
        <div className="recs-loading">
          <div className="recs-spinner" />
          <p>Analyzing TMDB database...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="recs-error glass-card animate-fade-in">
          <MdAutoAwesome size={48} className="recs-error-icon" />
          <h2>AI Error</h2>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => setError(null)}>Try Again</button>
        </div>
      )}

      {/* Results Grid */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="recs-results-container animate-fade-in">
          <div className="recs-results-header">
            <h3>Top Matches for You</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setRecommendations([])
              if (mode === 'quiz') { setQuizStep(0); setQuizAnswers({}); }
              if (mode === 'custom') { setCustomPrompt(''); }
            }}>Start Over</button>
          </div>
          <div className="recs-rich-grid">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="rec-rich-card glass-card">
                <div className="rec-card-image-wrap">
                  {rec.poster_url ? (
                    <img src={rec.poster_url} alt={rec.title} className="rec-card-image" />
                  ) : (
                    <div className="rec-card-no-image">
                      {rec.media_type === 'tv' || rec.type === 'tv_show' ? <MdTv size={48} /> : <MdMovie size={48} />}
                    </div>
                  )}
                  {rec.platform && <div className="rec-platform-badge">{rec.platform}</div>}
                </div>
                
                <div className="rec-card-content">
                  <div className="rec-card-meta">
                    {rec.release_year && <span><MdCalendarToday size={12} /> {rec.release_year}</span>}
                    {rec.runtime_minutes && <span><MdAccessTime size={12} /> {rec.runtime_minutes}m</span>}
                  </div>
                  <h3 className="rec-card-title">{rec.title}</h3>
                  {rec.genre && <p className="rec-card-genre">{rec.genre}</p>}
                  
                  <div className="rec-ai-reason">
                    <MdAutoAwesome size={14} className="ai-star-icon" />
                    <p>{rec.reason}</p>
                  </div>
                  
                  <a href={`/add?q=${encodeURIComponent(rec.title)}`} className="btn btn-outline btn-sm rec-card-btn">
                    Add to Collection <MdArrowForward size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
