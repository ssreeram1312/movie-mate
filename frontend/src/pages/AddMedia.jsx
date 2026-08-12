import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  MdSearch, MdClear, MdMovie, MdTv, MdArrowBack,
  MdAutoAwesome
} from 'react-icons/md'
import { mediaAPI, tmdbAPI } from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import './AddMedia.css'

const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Western']
const PLATFORMS = ['Netflix', 'Prime Video', 'Disney+', 'Hotstar', 'Apple TV+', 'HBO Max', 'Hulu', 'YouTube Premium', 'ZEE5', 'SonyLIV', 'JioCinema', 'Mubi', 'Other']

const mapTmdbGenre = (tmdbGenresStr) => {
  if (!tmdbGenresStr) return '';
  const first = tmdbGenresStr.split(',')[0].trim();
  const map = { 'Science Fiction': 'Sci-Fi', 'Action & Adventure': 'Action', 'Sci-Fi & Fantasy': 'Sci-Fi' };
  const mapped = map[first] || first;
  if (GENRES.includes(mapped)) return mapped;
  return GENRES.find(g => mapped.includes(g) || g.includes(mapped)) || '';
}

const mapTmdbPlatform = (platformStr) => {
  if (!platformStr) return '';
  const p = platformStr.toLowerCase();
  if (p.includes('netflix')) return 'Netflix';
  if (p.includes('amazon') || p.includes('prime')) return 'Prime Video';
  if (p.includes('disney')) return 'Disney+';
  if (p.includes('hotstar')) return 'Hotstar';
  if (p.includes('apple')) return 'Apple TV+';
  if (p.includes('hbo') || p.includes('max')) return 'HBO Max';
  if (p.includes('hulu')) return 'Hulu';
  if (p.includes('youtube')) return 'YouTube Premium';
  if (p.includes('zee5')) return 'ZEE5';
  if (p.includes('sony') || p.includes('liv')) return 'SonyLIV';
  if (p.includes('jio')) return 'JioCinema';
  if (p.includes('mubi')) return 'Mubi';
  return 'Other';
}

const INITIAL_FORM = {
  title: '',
  media_type: 'movie',
  director: '',
  genre: '',
  platform: '',
  status: 'wishlist',
  total_episodes: '',
  episodes_watched: 0,
  rating: '',
  review: '',
  notes: '',
  poster_url: '',
  backdrop_url: '',
  tmdb_id: '',
  release_year: '',
  runtime_minutes: '',
  overview: '',
}

export default function AddMedia() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEditMode = Boolean(id)
  
  // Get query param for initial search
  const queryParams = new URLSearchParams(location.search)
  const initialSearch = queryParams.get('q') || ''
  const prefill = location.state?.prefill || null
  
  const getInitialForm = () => {
    if (prefill) {
      let type = 'movie'
      const prefillType = (prefill.media_type || prefill.type || '').toLowerCase()
      if (
        prefillType.includes('tv') ||
        prefillType.includes('show') ||
        prefill.total_episodes ||
        prefill.episodes_watched
      ) {
        type = 'tv_show'
      }
      return {
        ...INITIAL_FORM,
        ...prefill,
        media_type: type,
        genre: prefill.genre ? mapTmdbGenre(prefill.genre) : '',
        platform: prefill.platform ? mapTmdbPlatform(prefill.platform) : '',
      }
    }
    return INITIAL_FORM
  }
  
  const [form, setForm] = useState(getInitialForm())
  // Only trigger dropdown search if we didn't already get rich TMDB data from the Picks page
  const [searchQuery, setSearchQuery] = useState(prefill?.tmdb_id ? '' : initialSearch)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [tmdbSelected, setTmdbSelected] = useState(!!prefill?.tmdb_id)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const dropdownRef = useRef(null)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch existing data for edit mode
  useEffect(() => {
    if (isEditMode) {
      mediaAPI.get(id)
        .then(res => {
          const d = res.data;
          setForm({
            ...INITIAL_FORM,
            ...d,
            genre: d.genre || '',
            platform: d.platform || '',
            total_episodes: d.total_episodes || '',
            episodes_watched: d.episodes_watched || 0,
            rating: d.rating || '',
            release_year: d.release_year || '',
            runtime_minutes: d.runtime_minutes || '',
          });
        })
        .catch(err => {
          setError('Failed to load media for editing');
        });
    }
  }, [id, isEditMode]);

  // TMDB search
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const fetchResults = async () => {
      setSearchLoading(true)
      try {
        const res = await tmdbAPI.search(debouncedSearch, 'multi')
        const results = (res.data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
        setSearchResults(results)
        setShowDropdown(true)
      } catch {
        // TMDB not yet set up — search silently fails
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }
    fetchResults()
  }, [debouncedSearch])

  // Auto-fill from TMDB when arriving from AI Picks without rich data
  useEffect(() => {
    if (!initialSearch || (prefill && prefill.tmdb_id)) return  // Already have rich data or no search
    if (isEditMode) return
    
    const autoFill = async () => {
      try {
        const res = await tmdbAPI.search(initialSearch, 'multi')
        const results = (res.data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
        if (results.length > 0) {
          // Auto-select the first matching result
          const firstMatch = results[0]
          const type = firstMatch.media_type || 'movie'
          const detailRes = await tmdbAPI.getDetails(firstMatch.id, type)
          const d = detailRes.data
          
          setForm({
            ...INITIAL_FORM,
            media_type: type === 'tv' ? 'tv_show' : 'movie',
            title: d.title || '',
            director: d.director || '',
            genre: mapTmdbGenre(d.genre),
            platform: mapTmdbPlatform(d.platform),
            poster_url: d.poster_url || '',
            backdrop_url: d.backdrop_url || '',
            tmdb_id: d.tmdb_id || '',
            release_year: d.release_year || '',
            runtime_minutes: d.runtime_minutes || '',
            overview: d.overview || '',
            total_episodes: d.total_episodes || '',
          })
          setSearchQuery(d.title || initialSearch)
          setTmdbSelected(true)
        }
      } catch {
        // Silently fail — the user can still search manually
      }
    }
    autoFill()
  }, [])  // Run once on mount

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleTmdbSelect = async (result) => {
    setShowDropdown(false)
    setSearchLoading(true)
    try {
      const type = result.media_type || (form.media_type === 'movie' ? 'movie' : 'tv')
      const res = await tmdbAPI.getDetails(result.id, type)
      const d = res.data

      setForm({
        ...INITIAL_FORM,
        media_type: type === 'tv' ? 'tv_show' : 'movie',
        title: d.title || '',
        director: d.director || '',
        genre: mapTmdbGenre(d.genre),
        platform: mapTmdbPlatform(d.platform),
        poster_url: d.poster_url || '',
        backdrop_url: d.backdrop_url || '',
        tmdb_id: d.tmdb_id || '',
        release_year: d.release_year || '',
        runtime_minutes: d.runtime_minutes || '',
        overview: d.overview || '',
        total_episodes: d.total_episodes || '',
      })
      setSearchQuery(d.title || '')
      setTmdbSelected(true)
    } catch {
      // Fallback: reset form and fill just the title
      setForm({
        ...INITIAL_FORM,
        media_type: type === 'tv' ? 'tv_show' : 'movie',
        title: result.title || result.name || '',
      })
      setSearchQuery(result.title || result.name || '')
      setTmdbSelected(true)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        total_episodes: form.total_episodes ? parseInt(form.total_episodes) : null,
        episodes_watched: form.episodes_watched ? parseInt(form.episodes_watched) : 0,
        rating: form.rating !== '' ? parseFloat(form.rating) : null,
        tmdb_id: form.tmdb_id ? parseInt(form.tmdb_id) : null,
        release_year: form.release_year ? parseInt(form.release_year) : null,
        runtime_minutes: form.runtime_minutes ? parseInt(form.runtime_minutes) : null,
        director: form.director || null,
        genre: form.genre || null,
        platform: form.platform || null,
        overview: form.overview || null,
        notes: form.notes || null,
      }
      
      let res;
      if (isEditMode) {
        res = await mediaAPI.update(id, payload)
      } else {
        res = await mediaAPI.create(payload)
      }
      
      navigate(`/media/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'add'} media. Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  const isTVShow = form.media_type === 'tv_show'

  return (
    <div className="page-container add-media animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="add-media-header-left">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            id="back-btn"
          >
            <MdArrowBack size={20} />
          </button>
          <h1 className="page-title">{isEditMode ? 'Edit Media' : 'Add to Collection'}</h1>
        </div>
      </div>

      <div className="add-media-layout">
        {/* Preview card */}
        <div className="add-media-preview glass-card">
          {form.poster_url ? (
            <img src={form.poster_url} alt="Poster preview" className="add-media-poster" />
          ) : (
            <div className="add-media-poster-placeholder">
              {form.media_type === 'movie' ? <MdMovie size={48} /> : <MdTv size={48} />}
              <span>Poster Preview</span>
            </div>
          )}
          {form.title && <p className="add-media-preview-title">{form.title}</p>}
          {form.release_year && <p className="add-media-preview-year">{form.release_year}</p>}
          {form.overview && <p className="add-media-preview-overview">{form.overview}</p>}
        </div>

        {/* Form */}
        <form className="add-media-form glass-card" onSubmit={handleSubmit} id="add-media-form" noValidate>

          {/* TMDB Search */}
          <div className="form-group">
            <label className="label" htmlFor="tmdb-search">
              <MdAutoAwesome size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Search from TMDB (auto-fill)
            </label>
            <div className="tmdb-search-wrap" ref={dropdownRef}>
              <MdSearch className="tmdb-search-icon" />
              <input
                id="tmdb-search"
                type="text"
                className="input tmdb-search-input"
                placeholder="Search TMDB for movies or TV shows..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setTmdbSelected(false)
                }}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon tmdb-clear-btn"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setTmdbSelected(false) }}
                  aria-label="Clear search"
                >
                  <MdClear size={16} />
                </button>
              )}
              {searchLoading && <div className="tmdb-spinner" />}

              {/* Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <ul className="tmdb-dropdown" role="listbox" aria-label="Search results">
                  {searchResults.slice(0, 6).map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        className="tmdb-dropdown-item"
                        onClick={() => handleTmdbSelect(result)}
                        role="option"
                        id={`tmdb-result-${result.id}`}
                      >
                        {result.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                            alt=""
                            className="tmdb-dropdown-poster"
                          />
                        ) : (
                          <div className="tmdb-dropdown-poster tmdb-dropdown-no-poster">
                            {isTVShow ? <MdTv size={16} /> : <MdMovie size={16} />}
                          </div>
                        )}
                        <div className="tmdb-dropdown-info">
                          <span className="tmdb-dropdown-title">{result.title || result.name}</span>
                          <span className="tmdb-dropdown-year">
                            {(result.release_date || result.first_air_date || '').slice(0, 4)}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {tmdbSelected && (
              <p className="tmdb-filled-note">
                ✓ Auto-filled from TMDB. Review and edit below.
              </p>
            )}
          </div>

          <div className="add-media-divider"><span>or fill manually</span></div>

          {/* Type toggle */}
          <div className="form-group">
            <label className="label">Type</label>
            <div className="type-toggle" role="group" aria-label="Media type">
              <button
                type="button"
                id="type-movie"
                className={`type-toggle-btn ${form.media_type === 'movie' ? 'active' : ''}`}
                onClick={() => handleChange('media_type', 'movie')}
              >
                <MdMovie size={16} /> Movie
              </button>
              <button
                type="button"
                id="type-tv"
                className={`type-toggle-btn ${form.media_type === 'tv_show' ? 'active' : ''}`}
                onClick={() => handleChange('media_type', 'tv_show')}
              >
                <MdTv size={16} /> TV Show
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="label" htmlFor="field-title">Title *</label>
            <input
              id="field-title"
              type="text"
              className="input"
              placeholder="Enter title"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          {/* Two-column row: Director + Genre */}
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="field-director">Director</label>
              <input
                id="field-director"
                type="text"
                className="input"
                placeholder="Director name"
                value={form.director}
                onChange={(e) => handleChange('director', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="field-genre">Genre</label>
              <select
                id="field-genre"
                className="select"
                value={form.genre}
                onChange={(e) => handleChange('genre', e.target.value)}
              >
                <option value="">Select genre</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Two-column row: Platform + Status */}
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="field-platform">Platform</label>
              <select
                id="field-platform"
                className="select"
                value={form.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
              >
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="field-status">Status</label>
              <select
                id="field-status"
                className="select"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="wishlist">Wishlist</option>
                <option value="watching">Watching</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* TV Show fields */}
          {isTVShow && (
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="field-total-eps">Total Episodes</label>
                <input
                  id="field-total-eps"
                  type="number"
                  className="input"
                  placeholder="e.g. 24"
                  min={1}
                  value={form.total_episodes}
                  onChange={(e) => handleChange('total_episodes', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="field-watched-eps">Episodes Watched</label>
                <input
                  id="field-watched-eps"
                  type="number"
                  className="input"
                  placeholder="e.g. 5"
                  min={0}
                  value={form.episodes_watched}
                  onChange={(e) => handleChange('episodes_watched', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Release year + Runtime */}
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="field-year">Release Year</label>
              <input
                id="field-year"
                type="number"
                className="input"
                placeholder="e.g. 2023"
                min={1900}
                max={2030}
                value={form.release_year}
                onChange={(e) => handleChange('release_year', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="field-runtime">
                {isTVShow ? 'Avg Episode Runtime (min)' : 'Runtime (min)'}
              </label>
              <input
                id="field-runtime"
                type="number"
                className="input"
                placeholder="e.g. 45"
                min={1}
                value={form.runtime_minutes}
                onChange={(e) => handleChange('runtime_minutes', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="label" htmlFor="field-notes">Personal Notes</label>
            <textarea
              id="field-notes"
              className="textarea"
              placeholder="Add notes (used for AI review generation later)"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && <p className="add-media-error">{error}</p>}

          {/* Submit */}
          <div className="add-media-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setForm(INITIAL_FORM);
                setSearchQuery('');
                setSearchResults([]);
                setTmdbSelected(false);
                setError(null);
              }}
              id="reset-btn"
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
              id="cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !form.title}
              id="submit-add-btn"
            >
              {submitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add to Collection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
