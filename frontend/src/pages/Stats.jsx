import { useState, useEffect } from 'react'
import { MdAccessTime, MdMovie, MdStar, MdOndemandVideo } from 'react-icons/md'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { statsAPI } from '../services/api'
import './Stats.css'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await statsAPI.getSummary()
      setStats(res.data)
    } catch (err) {
      console.error("Failed to load stats:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Stats & Analytics</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading stats...</div>
      </div>
    )
  }

  if (!stats) return null

  const pieData = [
    { name: 'Movies', value: stats.total_movies },
    { name: 'TV Shows', value: stats.total_shows }
  ]

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Stats & Analytics</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <MdAccessTime />
          </div>
          <div className="stat-info">
            <h3>Total Watch Time</h3>
            <p>{Math.floor(stats.total_watch_time_minutes / 60)} hrs {stats.total_watch_time_minutes % 60} min</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <MdMovie />
          </div>
          <div className="stat-info">
            <h3>Total Collection</h3>
            <p>{stats.total_collection} Items</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <MdStar />
          </div>
          <div className="stat-info">
            <h3>Average Rating</h3>
            <p>{stats.average_rating} / 10</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Collection Breakdown</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Genres</h3>
          <div className="chart-container">
            {stats.top_genres.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_genres} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" />
                  <Tooltip 
                    cursor={{fill: '#334155'}}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {stats.top_genres.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{textAlign: 'center', color: '#94a3b8', marginTop: '3rem'}}>Not enough data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
