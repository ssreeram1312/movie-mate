import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MdAdd, MdMovie, MdSearch } from 'react-icons/md'
import { mediaAPI } from '../services/api'
import MediaCard from '../components/MediaCard/MediaCard'
import FilterBar from '../components/FilterBar/FilterBar'
import './Dashboard.css'

const DEFAULT_FILTERS = {
  sort_by: 'created_at',
  order: 'desc',
}

export default function Dashboard() {
  const [media, setMedia] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { ...filters }
      if (search) params.search = search
      const res = await mediaAPI.list(params)
      setMedia(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setError('Failed to load your collection. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [filters, search])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const handleFilterChange = (newFilters) => setFilters(newFilters)
  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
  }

  // Stats summary
  const stats = {
    total: total,
    watching: media.filter((m) => m.status === 'watching').length,
    completed: media.filter((m) => m.status === 'completed').length,
    wishlist: media.filter((m) => m.status === 'wishlist').length,
  }

  return (
    <div className="page-container dashboard animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Collection</h1>
          <p className="dashboard-subtitle">
            {total} {total === 1 ? 'title' : 'titles'} in your library
          </p>
        </div>
        <Link to="/add" className="btn btn-primary" id="add-media-btn">
          <MdAdd size={18} />
          Add New
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-stats">
        <div className="dashboard-stat glass-card">
          <span className="dashboard-stat-value">{stats.watching}</span>
          <span className="dashboard-stat-label badge badge-watching">Watching</span>
        </div>
        <div className="dashboard-stat glass-card">
          <span className="dashboard-stat-value">{stats.completed}</span>
          <span className="dashboard-stat-label badge badge-completed">Completed</span>
        </div>
        <div className="dashboard-stat glass-card">
          <span className="dashboard-stat-value">{stats.wishlist}</span>
          <span className="dashboard-stat-label badge badge-wishlist">Wishlist</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="dashboard-search-wrap">
        <MdSearch className="dashboard-search-icon" aria-hidden="true" />
        <input
          id="search-input"
          type="text"
          className="input dashboard-search"
          placeholder="Search your collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search collection"
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Content */}
      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="media-card-skeleton">
              <div className="skeleton media-card-skeleton-poster" />
              <div className="media-card-skeleton-info">
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
                <div className="skeleton" style={{ height: 12, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="dashboard-empty">
          <MdMovie size={64} className="dashboard-empty-icon" />
          <h2>Backend not connected</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchMedia} id="retry-btn">Retry</button>
        </div>
      ) : media.length === 0 ? (
        <div className="dashboard-empty">
          <MdMovie size={64} className="dashboard-empty-icon" />
          <h2>{search || Object.keys(filters).length > 2 ? 'No results found' : 'Your collection is empty'}</h2>
          <p>
            {search || Object.keys(filters).length > 2
              ? 'Try adjusting your filters or search query.'
              : 'Start building your movie & show collection!'}
          </p>
          {!search && Object.keys(filters).length <= 2 && (
            <Link to="/add" className="btn btn-primary" id="empty-add-btn">
              <MdAdd size={18} />
              Add your first title
            </Link>
          )}
        </div>
      ) : (
        <div className="media-grid">
          {media.map((item, idx) => (
            <MediaCard key={item.id} media={item} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}
