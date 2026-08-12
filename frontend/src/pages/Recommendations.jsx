import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MdAutoAwesome, MdMovie, MdTv, MdArrowForward, MdSearch, MdQuestionAnswer, MdList, MdCalendarToday, MdAccessTime, MdRefresh } from 'react-icons/md'
import { aiAPI, mediaAPI, tmdbAPI } from '../services/api'
import './Recommendations.css'

const QUIZ_QUESTIONS = [
  { id: 'mood', question: "What's your current mood?", options: ['Happy & Light', 'Dark & Gritty', 'Mind-bending', 'Thrilling', 'Relaxed'] },
  { id: 'pacing', question: "What kind of pacing do you prefer?", options: ['Fast & Action-packed', 'Slow burn & Character driven', 'Balanced'] },
  { id: 'format', question: "Movie or TV Show?", options: ['Movie', 'TV Show', 'Surprise me!'] }
];

export default function Recommendations() {
  const [recsByMode, setRecsByMode] = useState({ collection: [], quiz: [], custom: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshingIdx, setRefreshingIdx] = useState(null)
  
  const [hasCollection, setHasCollection] = useState(true)
  const [mode, setMode] = useState('collection') // collection, quiz, custom
  
  const [customPrompt, setCustomPrompt] = useState('')
  const [quizStep, setQuizStep] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})

  const CACHE_KEY = 'moviemate_ai_picks_state_v2'
  const fetchingRef = useRef(false)  // Guard against React StrictMode double-fire

  // Check if collection has items on mount and load cache
  useEffect(() => {
    let cancelled = false
    const loadState = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        let loadedFromCache = false;
        if (cached) {
          const parsed = JSON.parse(cached)
          // Only use cache if it's less than 24h old
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            if (!cancelled) {
              setRecsByMode(parsed.recsByMode || { collection: [], quiz: [], custom: [] })
              setMode(parsed.mode || 'collection')
              setHasCollection(true)
              loadedFromCache = true;
            }
          }
        }
        
        // Always check if they actually have a collection
        const res = await mediaAPI.list({ limit: 1 })
        if (cancelled) return
        if (res.data.total === 0) {
          setHasCollection(false)
          if (mode === 'collection') setMode('quiz')
        } else {
          setHasCollection(true)
          if (!loadedFromCache) {
            fetchRecs('collection')
          }
        }
      } catch (err) {
        if (!cancelled) console.error(err)
      }
    }
    loadState()
    return () => { cancelled = true }
  }, [])

  const saveToCache = (newRecsByMode, currentMode) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      recsByMode: newRecsByMode,
      mode: currentMode,
      timestamp: Date.now()
    }))
  }

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY)
  }

  const fetchRecs = async (fetchMode = mode, data = null) => {
    // Prevent duplicate concurrent API calls (React StrictMode fires effects twice)
    if (fetchingRef.current) return
    fetchingRef.current = true
    
    setLoading(true)
    setError(null)
    
    // Clear only the current mode's recs while loading
    setRecsByMode(prev => ({ ...prev, [fetchMode]: [] }))
    
    try {
      const payload = { mode: fetchMode, data: data }
      const res = await aiAPI.getRecommendations(payload)
      const recs = res.data.recommendations || []
      
      // If collection mode returned empty, it means collection is actually empty
      if (fetchMode === 'collection' && recs.length === 0) {
        setHasCollection(false)
        setMode('quiz')
      } else {
        setRecsByMode(prev => {
          const newRecs = { ...prev, [fetchMode]: recs }
          saveToCache(newRecs, fetchMode)
          return newRecs
        })
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError("You've requested too many AI picks! Please wait a minute before trying again.")
      } else {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to get recommendations.')
      }
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setError(null)
    
    setRecsByMode(prev => {
      saveToCache(prev, newMode)
      // If switching to collection and it's empty but user HAS a collection, auto-fetch
      if (newMode === 'collection' && hasCollection && prev.collection.length === 0) {
        // use a timeout to avoid fetching during render cycle
        setTimeout(() => fetchRecs('collection'), 0)
      }
      return prev
    })
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
    if (loading) return null;
    if (recsByMode.quiz.length > 0) return null;
    
    const q = QUIZ_QUESTIONS[quizStep];
    return (
      <div className="recs-quiz-card glass-card animate-fade-in">
        <div className="quiz-header">
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((quizStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }} />
          </div>
          <div className="quiz-progress-text">Question {quizStep + 1} of {QUIZ_QUESTIONS.length}</div>
        </div>
        <h3 className="quiz-question">{q.question}</h3>
        <div className="quiz-options">
          {q.options.map(opt => (
            <button key={opt} className="quiz-opt-btn" onClick={() => handleQuizAnswer(opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderCustom = () => {
    if (loading || recsByMode.custom.length > 0) return null;
    return (
      <div className="recs-custom-card glass-card animate-fade-in">
        <div className="custom-header">
          <MdAutoAwesome size={32} className="custom-icon" />
          <h3>Ask MovieMate AI</h3>
          <p>Tell me exactly what you're looking for...</p>
        </div>
        <form onSubmit={handleCustomSubmit} className="recs-custom-form">
          <textarea
            className="textarea custom-textarea"
            placeholder="e.g., 'I want to watch a sci-fi movie like Interstellar but with more action'"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
          />
          <button type="submit" className="btn btn-primary custom-submit-btn" disabled={!customPrompt.trim()}>
            <MdAutoAwesome size={18} /> Generate Picks
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
          <button className={`mode-btn ${mode === 'collection' ? 'active' : ''}`} onClick={() => handleModeChange('collection')}>
            <MdList size={18} /> Based on Collection
          </button>
          <button className={`mode-btn ${mode === 'quiz' ? 'active' : ''}`} onClick={() => handleModeChange('quiz')}>
            <MdQuestionAnswer size={18} /> Take Quiz
          </button>
          <button className={`mode-btn ${mode === 'custom' ? 'active' : ''}`} onClick={() => handleModeChange('custom')}>
            <MdSearch size={18} /> Ask AI directly
          </button>
        </div>
      )}

      {/* States */}
      {!hasCollection && recsByMode.collection.length === 0 && !loading && mode === 'collection' && renderEmptyState()}
      
      {mode === 'quiz' && renderQuiz()}
      {mode === 'custom' && renderCustom()}

      {/* Loading State */}
      {loading && (
        <div className="recs-results-container animate-fade-in">
          <div className="recs-results-header">
            <h3>Analyzing TMDB database...</h3>
          </div>
          <div className="recs-rich-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rec-rich-card glass-card">
                <div className="skeleton" style={{ width: '100%', aspectRatio: '2/3', borderRadius: '0' }} />
                <div className="rec-card-content" style={{ gap: '12px', padding: '16px' }}>
                  <div className="skeleton" style={{ width: '40%', height: '14px' }} />
                  <div className="skeleton" style={{ width: '80%', height: '24px' }} />
                  <div className="skeleton" style={{ width: '60%', height: '14px' }} />
                  <div className="skeleton" style={{ width: '100%', height: '50px', marginTop: 'auto', borderRadius: '8px' }} />
                  <div className="skeleton" style={{ width: '100%', height: '32px', borderRadius: '8px' }} />
                </div>
              </div>
            ))}
          </div>
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
      {!loading && !error && recsByMode[mode].length > 0 && (
        <div className="recs-results-container animate-fade-in">
          <div className="recs-results-header">
            <h3>Top Matches for You</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (mode === 'collection') {
                fetchRecs('collection')
              } else {
                setRecsByMode(prev => {
                  const newRecs = { ...prev, [mode]: [] }
                  saveToCache(newRecs, mode)
                  return newRecs
                })
                if (mode === 'quiz') { setQuizStep(0); setQuizAnswers({}); }
                if (mode === 'custom') { setCustomPrompt(''); }
              }
            }}>Start Over</button>
          </div>
          <div className="recs-rich-grid">
            {recsByMode[mode].map((rec, idx) => (
              <div key={idx} className="rec-rich-card glass-card">
                <div className="rec-card-image-wrap">
                  {rec.poster_url ? (
                    <img src={rec.poster_url} alt={rec.title} className="rec-card-image" />
                  ) : (
                    <div className="rec-card-no-image">
                      {refreshingIdx === idx ? (
                        <MdRefresh size={32} className="rec-refresh-spinning" />
                      ) : (
                        <>
                          {rec.media_type === 'tv' || rec.type === 'tv_show' ? <MdTv size={48} /> : <MdMovie size={48} />}
                          <button
                            className="rec-refresh-btn"
                            title="Retry fetching details"
                            onClick={async (e) => {
                              e.stopPropagation()
                              setRefreshingIdx(idx)
                              try {
                                const searchRes = await tmdbAPI.search(rec.title, 'multi')
                                const results = (searchRes.data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
                                if (results.length > 0) {
                                  const match = results[0]
                                  const detailRes = await tmdbAPI.getDetails(match.id, match.media_type)
                                  const d = detailRes.data
                                  setRecsByMode(prev => {
                                    const updated = [...prev[mode]]
                                    updated[idx] = { ...d, reason: rec.reason, media_type: match.media_type }
                                    const newRecs = { ...prev, [mode]: updated }
                                    saveToCache(newRecs, mode)
                                    return newRecs
                                  })
                                }
                              } catch { /* silently fail */ }
                              setRefreshingIdx(null)
                            }}
                          >
                            <MdRefresh size={20} /> Retry
                          </button>
                        </>
                      )}
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
                  
                  <Link to={`/add?q=${encodeURIComponent(rec.title)}`} state={{ prefill: rec }} className="btn btn-outline btn-sm rec-card-btn">
                    Add to Collection <MdArrowForward size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
