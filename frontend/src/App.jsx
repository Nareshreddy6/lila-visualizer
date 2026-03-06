import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import StatsPanel from './components/StatsPanel'

export default function App() {
  const [matches, setMatches] = useState([])
  const [selectedMap, setSelectedMap] = useState('AmbroseValley')
  const [selectedDate, setSelectedDate] = useState('all')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [compareMatch, setCompareMatch] = useState(null)
  const [activeLayer, setActiveLayer] = useState('journeys')
  const [showBots, setShowBots] = useState(true)
  const [showHumans, setShowHumans] = useState(true)
  const [playbackTime, setPlaybackTime] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [eventData, setEventData] = useState([])
  const [heatmapData, setHeatmapData] = useState({})
  const [deadZoneData, setDeadZoneData] = useState({})
  const [playersData, setPlayersData] = useState({})
  const [loading, setLoading] = useState(true)
  const [focusedPlayer, setFocusedPlayer] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [filterEventType, setFilterEventType] = useState('all')
  const [compareMode, setCompareMode] = useState(false)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/matches.json').then(r => r.json()),
      fetch('/heatmaps.json').then(r => r.json()),
      fetch('/deadzones.json').then(r => r.json()),
      fetch('/players.json').then(r => r.json()),
    ]).then(([m, h, d, p]) => {
      setMatches(m)
      setHeatmapData(h)
      setDeadZoneData(d)
      setPlayersData(p)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    setSelectedMatch(null)
    setCompareMatch(null)
    setEventData([])
    setFocusedPlayer(null)
    fetch(`/events_${selectedMap}.json`)
      .then(r => r.json())
      .then(data => { setEventData(data); setLoading(false) })
  }, [selectedMap])

  const filteredMatches = matches.filter(m => {
    if (m.map_id !== selectedMap) return false
    if (selectedDate !== 'all' && m.date !== selectedDate) return false
    return true
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f1117' }}>
      <Sidebar
        matches={filteredMatches}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedMatch={selectedMatch}
        setSelectedMatch={setSelectedMatch}
        compareMatch={compareMatch}
        setCompareMatch={setCompareMatch}
        setActiveLayer={setActiveLayer}
        showBots={showBots}
        setShowBots={setShowBots}
        showHumans={showHumans}
        setShowHumans={setShowHumans}
        activeLayerValue={activeLayer}
        loading={loading}
        focusedPlayer={focusedPlayer}
        setFocusedPlayer={setFocusedPlayer}
        playersData={playersData}
        isAnnotating={isAnnotating}
        setIsAnnotating={setIsAnnotating}
        filterEventType={filterEventType}
        setFilterEventType={setFilterEventType}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        showStats={showStats}
        setShowStats={setShowStats}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MapView
          selectedMap={selectedMap}
          selectedMatch={selectedMatch}
          compareMatch={compareMatch}
          eventData={eventData}
          heatmapData={heatmapData}
          deadZoneData={deadZoneData}
          activeLayer={activeLayer}
          showBots={showBots}
          showHumans={showHumans}
          playbackTime={playbackTime}
          setPlaybackTime={setPlaybackTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          loading={loading}
          focusedPlayer={focusedPlayer}
          setFocusedPlayer={setFocusedPlayer}
          annotations={annotations}
          setAnnotations={setAnnotations}
          isAnnotating={isAnnotating}
          filterEventType={filterEventType}
          compareMode={compareMode}
        />
        {showStats && selectedMatch && (
          <StatsPanel
            selectedMatch={selectedMatch}
            eventData={eventData}
            onClose={() => setShowStats(false)}
          />
        )}
      </div>
    </div>
  )
}
