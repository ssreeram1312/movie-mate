import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import Recommendations from './pages/Recommendations'
import WatchParty from './pages/WatchParty'
import './App.css'

import AddMedia from './pages/AddMedia'
// MediaDetail will be added next
// import MediaDetail from './pages/MediaDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="add" element={<AddMedia />} />
          {/* Phase 2: MediaDetail coming next */}
          {/* <Route path="media/:id" element={<MediaDetail />} /> */}
          <Route path="stats" element={<Stats />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="watch-party" element={<WatchParty />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
