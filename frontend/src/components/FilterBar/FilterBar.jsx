import { MdFilterList, MdSwapVert, MdClose, MdSearch } from 'react-icons/md'
import './FilterBar.css'

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance', 'Documentary', 'Animation', 'Fantasy']
const PLATFORMS = ['Netflix', 'Prime Video', 'Disney+', 'Hotstar', 'Apple TV+', 'HBO Max', 'Hulu', 'YouTube Premium', 'ZEE5', 'SonyLIV']
const STATUSES = [
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'wishlist', label: 'Wishlist' },
]
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Rating' },
  { value: 'release_year', label: 'Release Year' },
]

export default function FilterBar({ filters, search, onFilterChange, onSearchChange, onClear }) {
  const hasActiveFilters = filters.genre || filters.platform || filters.status || filters.media_type

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div className="filter-bar" role="search" aria-label="Filter and sort media">
      <div className="filter-bar-icon">
        <MdFilterList size={18} aria-hidden="true" />
      </div>

      {/* Genre filter */}
      <select
        id="filter-genre"
        className="select filter-select"
        value={filters.genre || ''}
        onChange={(e) => handleChange('genre', e.target.value)}
        aria-label="Filter by genre"
      >
        <option value="">All Genres</option>
        {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      {/* Platform filter */}
      <select
        id="filter-platform"
        className="select filter-select"
        value={filters.platform || ''}
        onChange={(e) => handleChange('platform', e.target.value)}
        aria-label="Filter by platform"
      >
        <option value="">All Platforms</option>
        {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Status filter */}
      <select
        id="filter-status"
        className="select filter-select"
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Type filter */}
      <select
        id="filter-type"
        className="select filter-select"
        value={filters.media_type || ''}
        onChange={(e) => handleChange('media_type', e.target.value)}
        aria-label="Filter by type"
      >
        <option value="">Movies & Shows</option>
        <option value="movie">Movies Only</option>
        <option value="tv_show">TV Shows Only</option>
      </select>

      {/* Sort */}
      <div className="filter-bar-sort">
        <MdSwapVert size={16} aria-hidden="true" />
        <select
          id="sort-by"
          className="select filter-select"
          value={filters.sort_by || 'created_at'}
          onChange={(e) => handleChange('sort_by', e.target.value)}
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          id="sort-order"
          className="select filter-select filter-select-sm"
          value={filters.order || 'desc'}
          onChange={(e) => handleChange('order', e.target.value)}
          aria-label="Sort order"
        >
          <option value="desc">↓ Desc</option>
          <option value="asc">↑ Asc</option>
        </select>
      </div>

      {/* Search bar */}
      <div className="filter-bar-search">
        <MdSearch className="filter-bar-search-icon" aria-hidden="true" />
        <input
          id="filter-search-input"
          type="text"
          className="input filter-search"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search collection"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          id="clear-filters-btn"
          className="btn btn-ghost btn-icon"
          onClick={onClear}
          title="Clear all filters"
          aria-label="Clear all filters"
        >
          <MdClose size={18} />
        </button>
      )}
    </div>
  )
}
