import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MdMenu, MdClose, MdSearch } from 'react-icons/md'
import './Navbar.css'

const pageTitles = {
  '/': 'Dashboard',
  '/add': 'Add Movie / Show',
  '/stats': 'Stats & Analytics',
  '/recommendations': 'AI Recommendations',
  '/watch-party': 'Watch Party Planner',
}

export default function Navbar({ onMenuToggle, sidebarOpen }) {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'MovieMate'

  return (
    <header className="navbar" role="banner">
      {/* Mobile menu toggle */}
      <button
        id="menu-toggle-btn"
        className="btn btn-ghost btn-icon navbar-menu-btn"
        onClick={onMenuToggle}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <MdClose size={20} /> : <MdMenu size={20} />}
      </button>

      {/* Page title */}
      <h1 className="navbar-title">{title}</h1>

      {/* Right side */}
      <div className="navbar-right">
        <div className="navbar-status-dot" title="Backend connected" aria-label="Backend status" />
      </div>
    </header>
  )
}
