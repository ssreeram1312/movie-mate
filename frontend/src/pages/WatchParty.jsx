import { MdGroup } from 'react-icons/md'
import './Placeholder.css'

export default function WatchParty() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Watch Party Planner</h1>
      </div>
      <div className="placeholder-page">
        <MdGroup size={64} className="placeholder-icon" />
        <h2>Coming in Phase 6</h2>
        <p>Plan the perfect watch party by syncing availability with your friends.</p>
      </div>
    </div>
  )
}
