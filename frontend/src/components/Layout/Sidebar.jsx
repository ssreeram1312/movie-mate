import { NavLink } from 'react-router-dom'
import {
  MdMovie,
  MdDashboard,
  MdAdd,
  MdBarChart,
  MdGroup,
} from 'react-icons/md'
import { RiRobot2Line } from 'react-icons/ri'
import './Sidebar.css'

const navItems = [
  { to: '/', icon: MdDashboard, label: 'Dashboard' },
  { to: '/add', icon: MdAdd, label: 'Add Movie / Show' },
  { to: '/stats', icon: MdBarChart, label: 'Stats' },
  { to: '/recommendations', icon: RiRobot2Line, label: 'AI Picks' },
  { to: '/watch-party', icon: MdGroup, label: 'Watch Party' },
]

export default function Sidebar({ isOpen }) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`} aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <MdMovie className="sidebar-logo-icon" aria-hidden="true" />
        <span className="sidebar-logo-text">MovieMate</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list" role="list">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
                aria-label={label}
              >
                <Icon className="sidebar-nav-icon" aria-hidden="true" />
                <span className="sidebar-nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <p className="sidebar-footer-text">MovieMate v1.0</p>
      </div>
    </aside>
  )
}
