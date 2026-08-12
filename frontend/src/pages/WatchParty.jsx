import { useState, useEffect } from 'react'
import { MdGroup, MdAdd, MdDelete, MdEventAvailable } from 'react-icons/md'
import './WatchParty.css'

export default function WatchParty() {
  const [friends, setFriends] = useState([
    { id: 1, name: 'Me', start: '18:00', end: '22:00' },
    { id: 2, name: 'Friend 1', start: '19:00', end: '23:00' }
  ])
  const [overlap, setOverlap] = useState(null)

  useEffect(() => {
    calculateOverlap()
  }, [friends])

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
      setOverlap({ start: maxStart, end: minEnd })
    } else {
      setOverlap(false) // false means no overlap
    }
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

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Watch Party Planner</h1>
      </div>

      <div className="watch-party-container">
        <div className="friends-list">
          <h2>Availability</h2>
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
          
          <button className="btn-add" onClick={addFriend}>
            <MdAdd size={20} /> Add Person
          </button>
        </div>

        <div className="results-panel">
          <MdEventAvailable size={64} className="overlap-icon" />
          
          {overlap === null ? (
            <p className="overlap-text">Enter everyone's availability to find the best time to watch together.</p>
          ) : overlap === false ? (
            <div>
              <h3 className="no-overlap">No Overlapping Time!</h3>
              <p className="overlap-text">Someone needs to reschedule to make this watch party happen.</p>
            </div>
          ) : (
            <div>
              <p className="overlap-text">Perfect time for a watch party:</p>
              <div className="overlap-time">
                {overlap.start} - {overlap.end}
              </div>
              <p className="overlap-text">Grab the popcorn! 🍿</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
