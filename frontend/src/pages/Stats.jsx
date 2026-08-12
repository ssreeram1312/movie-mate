import { MdBarChart } from 'react-icons/md'
import './Placeholder.css'

export default function Stats() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Stats & Analytics</h1>
      </div>
      <div className="placeholder-page">
        <MdBarChart size={64} className="placeholder-icon" />
        <h2>Coming in Phase 6</h2>
        <p>Watch time graphs, genre breakdowns, and viewing habits analytics will appear here.</p>
      </div>
    </div>
  )
}
