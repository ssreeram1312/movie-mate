import { RiRobot2Line } from 'react-icons/ri'
import './Placeholder.css'

export default function Recommendations() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">AI Recommendations</h1>
      </div>
      <div className="placeholder-page">
        <RiRobot2Line size={64} className="placeholder-icon" />
        <h2>Coming in Phase 5</h2>
        <p>Personalized movie and show recommendations powered by Gemini AI will appear here.</p>
      </div>
    </div>
  )
}
