import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'

export default function App() {
  const [matches, setMatches] = useState([])
  const [selectedMap, setSelectedMap] = useState('AmbroseValley')
  const [selectedDate, setSelectedDate] = useState('all')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [activeLayer, setActiveLayer] = useState('journeys')
  const [showBots, setShowBots] = useState(true)
  const [showHumans, setShowHumans] = useState(true)
  const [playbackTime, setPlaybackTime] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [eventData, setEventData] = useState([])
  const [heatmapData, setHeatmapData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/matches.json').then(r => r.json()),
      fetch('/heatmaps.json').then(r => r.json()),
    ]).then(([m, h]) => {
      setMatches(m)
      setHeatmapData(h)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    setSelectedMatch(null)
    setEventData([])
    fetch('/events_' + selectedMap + '.json')
      .then(r => r.json())
      .then(data => { setEventData(data); setLoading(false) })
  }, [selectedMap])

  const filteredMatches = matches.filter(m => {
    if (m.map_id !== selectedMap) return false
    if (selectedDate !== 'all' && m.date !== selectedDate) return false
    return true
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        matches={filteredMatches}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedMatch={selectedMatch}
        setSelectedMatch={setSelectedMatch}
        setActiveLayer={setActiveLayer}
        showBots={showBots}
        setShowBots={setShowBots}
        showHumans={showHumans}
        setShowHumans={setShowHumans}
        activeLayerValue={activeLayer}
        loading={loading}
      />
      <MapView
        selectedMap={selectedMap}
        selectedMatch={selectedMatch}
        eventData={eventData}
        heatmapData={heatmapData}
        activeLayer={activeLayer}
        showBots={showBots}
        showHumans={showHumans}
        playbackTime={playbackTime}
        setPlaybackTime={setPlaybackTime}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        loading={loading}
      />
    </div>
  )
}
