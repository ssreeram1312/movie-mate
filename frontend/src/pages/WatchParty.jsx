import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MdGroup, MdAdd, MdDelete, MdEventAvailable, MdMovie, MdAutoAwesome, MdArrowForward, MdCalendarToday, MdAccessTime, MdContentCopy, MdRefresh, MdTv } from 'react-icons/md'
import { aiAPI, tmdbAPI } from '../services/api'
import './WatchParty.css'

const QUIZ_QUESTIONS = [
  { id: 'type', question: "What are we watching?", options: ['Movies', 'TV Shows', 'Surprise Me'] },
  { id: 'mood', question: "What's the vibe for this watch party?", options: ['Fun & Light', 'Dark & Gritty', 'Mind-bending', 'Thrilling', 'Scary'] },
  { id: 'pacing', question: "What kind of pacing do you prefer?", options: ['Fast & Action-packed', 'Slow burn & Character driven', 'Balanced'] },
]

const formatTimeAMPM = (time24) => {
  if (!time24) return '?'
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export default function WatchParty() {
  const [friends, setFriends] = useState(() => {
    const cached = localStorage.getItem('watchParty_friends')
    if (cached) {
      try { return JSON.parse(cached) } catch { /* ignore */ }
    }
    return [
      { id: 1, name: 'Me', start: '19:00', end: '21:30' },
      { id: 2, name: 'Friend 1', start: '19:30', end: '22:00' }
    ]
  })
  const [overlap, setOverlap] = useState(null)
  
  // AI State
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizStep, setQuizStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [recs, setRecs] = useState(() => {
    const cached = localStorage.getItem('watchParty_recs')
    if (cached) {
      try { return JSON.parse(cached) } catch { /* ignore */ }
    }
    return []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshingIdx, setRefreshingIdx] = useState(null)

  useEffect(() => {
    calculateOverlap()
    localStorage.setItem('watchParty_friends', JSON.stringify(friends))
  }, [friends])

  useEffect(() => {
    localStorage.setItem('watchParty_recs', JSON.stringify(recs))
  }, [recs])

  const calculateOverlap = () => {
    if (friends.length === 0) {
      setOverlap(null)
      return
    }

    let maxStart = '00:00'
    let minEnd = '23:59'

    for (let f of friends) {
      if (!f.start || !f.end) return setOverlap(null)
      if (f.start > maxStart) maxStart = f.start
      if (f.end < minEnd) minEnd = f.end
    }

    if (maxStart < minEnd) {
      // Calculate duration in minutes
      const startParts = maxStart.split(':').map(Number)
      const endParts = minEnd.split(':').map(Number)
      const startMins = startParts[0] * 60 + startParts[1]
      const endMins = endParts[0] * 60 + endParts[1]
      const durationMins = endMins - startMins
      
      setOverlap({ start: maxStart, end: minEnd, durationMins })
    } else {
      setOverlap(false) // false means no overlap
      setShowQuiz(false)
    }
    
    // Clear recs if times change significantly
    setRecs([])
    setQuizStep(0)
  }

  const addFriend = () => {
    setFriends([...friends, { id: Date.now(), name: `Friend ${friends.length}`, start: '18:00', end: '22:00' }])
  }

  const updateFriend = (id, field, value) => {
    setFriends(friends.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  const removeFriend = (id) => {
    setFriends(friends.filter(f => f.id !== id))
  }
  
  const handleAnswer = async (answer) => {
    const currentQ = QUIZ_QUESTIONS[quizStep]
    const newAnswers = { ...answers, [currentQ.id]: answer }
    setAnswers(newAnswers)
    
    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setQuizStep(prev => prev + 1)
    } else {
      // Finished quiz, fetch recs
      setLoading(true)
      setError(null)
      setShowQuiz(false)
      
      try {
        const payload = {
          duration_minutes: overlap.durationMins,
          type: newAnswers.type,
          mood: newAnswers.mood,
          pacing: newAnswers.pacing
        }
        const res = await aiAPI.getWatchPartyRecommendations(payload)
        setRecs(res.data.recommendations || [])
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to get recommendations.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="page-container animate-fade-in wp-page">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'none' }}>Watch Party Planner</h1>
      </div>

      <div className="watch-party-container">
        {/* LEFT PANEL: Time Calculator */}
        <div className="friends-list glass-card">
          <div className="friends-header">
            <h2>Availability</h2>
            <p className="text-muted">Enter everyone's free time to find the overlap.</p>
          </div>
          
          <div className="friends-inputs">
            {friends.map((friend) => (
              <div key={friend.id} className="friend-item">
                <input 
                  type="text" 
                  value={friend.name}
                  onChange={(e) => updateFriend(friend.id, 'name', e.target.value)}
                  placeholder="Name"
                />
                <input 
                  type="time" 
                  value={friend.start}
                  onChange={(e) => updateFriend(friend.id, 'start', e.target.value)}
                />
                <input 
                  type="time" 
                  value={friend.end}
                  onChange={(e) => updateFriend(friend.id, 'end', e.target.value)}
                />
                <button className="btn-icon" onClick={() => removeFriend(friend.id)}>
                  <MdDelete size={20} />
                </button>
              </div>
            ))}
          </div>
          
          <button className="btn-add" onClick={addFriend}>
            <MdAdd size={20} /> Add Person
          </button>
          
          {overlap && overlap.durationMins > 0 && (
            <div className="overlap-success-box">
              <div className="overlap-time-display">
                <h3>{formatTimeAMPM(overlap.start)} - {formatTimeAMPM(overlap.end)}</h3>
                <span className="badge-duration">{overlap.durationMins} mins</span>
              </div>
              <p>You have exactly {overlap.durationMins} minutes of overlapping free time!</p>
              
              {recs.length === 0 && !loading && !showQuiz && (
                <button className="btn btn-primary w-full mt-4" onClick={() => setShowQuiz(true)}>
                  <MdAutoAwesome size={18} /> Ask AI for Perfect Fits
                </button>
              )}
            </div>
          )}
          
          {overlap === false && (
            <div className="overlap-error-box">
              <h3>No Overlapping Time!</h3>
              <p>Someone needs to reschedule to make this watch party happen.</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: AI Results / Quiz */}
        <div className="wp-results-panel">
          {showQuiz ? (
            <div className="quiz-card glass-card animate-fade-in">
              <h3 className="quiz-question">{QUIZ_QUESTIONS[quizStep].question}</h3>
              <div className="quiz-options">
                {QUIZ_QUESTIONS[quizStep].options.map((opt, i) => (
                  <button key={i} className="quiz-opt-btn" onClick={() => handleAnswer(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="loading-state glass-card">
              <div className="spinner"></div>
              <p>Finding perfect movies under {overlap.durationMins} mins...</p>
            </div>
          ) : error ? (
            <div className="error-message glass-card">
              <p>{error}</p>
              <button className="btn btn-outline" onClick={() => setShowQuiz(true)}>Try Again</button>
            </div>
          ) : recs.length > 0 ? (
            <div className="wp-recs-container">
              <div className="recs-results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Recommended for your {overlap?.durationMins || 0}m window</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setRecs([])
                  setShowQuiz(false)
                  setQuizStep(0)
                  setAnswers({})
                }}>
                  <MdRefresh size={18} /> Start Over
                </button>
              </div>
              <div className="wp-recs-grid animate-fade-in">
                {recs.map((rec, idx) => (
                <div key={idx} className="wp-rec-card glass-card">
                  <div className="wp-card-img-wrap">
                    {rec.poster_url ? (
                      <img src={rec.poster_url} alt={rec.title} />
                    ) : (
                      <div className="wp-no-img">
                        {refreshingIdx === idx ? (
                          <MdRefresh size={32} className="rec-refresh-spinning" />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            {rec.media_type === 'tv' || rec.type === 'tv_show' ? <MdTv size={32} /> : <MdMovie size={32} />}
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
                                    setRecs(prev => {
                                      const updated = [...prev]
                                      updated[idx] = { ...d, reason: rec.reason, media_type: match.media_type }
                                      return updated
                                    })
                                  }
                                } catch { /* silently fail */ }
                                setRefreshingIdx(null)
                              }}
                            >
                              <MdRefresh size={16} /> Retry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="wp-duration-badge" style={{
                      backgroundColor: rec.runtime_minutes <= (overlap?.durationMins || Infinity) ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'
                    }}>
                      {rec.runtime_minutes ? `${rec.runtime_minutes}m` : 'Unknown'}
                    </div>
                  </div>
                  <div className="wp-card-content">
                    <h4>{rec.title}</h4>
                    <p className="wp-ai-reason"><MdAutoAwesome className="text-accent" /> {rec.reason}</p>
                    <div className="wp-card-actions">
                      <Link to={`/add?q=${encodeURIComponent(rec.title)}`} state={{ prefill: rec }} className="btn-icon">
                        <MdAdd size={20} />
                      </Link>
                      <button className="btn-icon" onClick={() => {
                        const text = `🍿 Movie Night!\nWe're watching ${rec.title} from ${formatTimeAMPM(overlap?.start)} to ${formatTimeAMPM(overlap?.end)}.\nIt's ${rec.runtime_minutes || '?'} mins long so it fits perfectly in our schedule!`;
                        navigator.clipboard.writeText(text);
                        alert("Invite copied to clipboard!");
                      }} title="Copy Invite">
                        <MdContentCopy size={18} />
                      </button>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className="empty-state-wp glass-card">
               <MdEventAvailable size={64} className="text-muted" />
               <p>Enter your availability on the left, then ask AI to find the perfect movie that fits into your schedule.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
