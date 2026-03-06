import { useEffect, useRef, useState, useCallback } from 'react'
import Timeline from './Timeline'

const MAP_IMAGES = {
  AmbroseValley: '/AmbroseValley_Minimap.png',
  GrandRift: '/GrandRift_Minimap.png',
  Lockdown: '/Lockdown_Minimap.jpg',
}
const EVENT_COLORS = {
  Position: '#4488ff', BotPosition: '#44aa44',
  Kill: '#ff4444', Killed: '#ff8844',
  BotKill: '#ffaa00', BotKilled: '#ff6600',
  KilledByStorm: '#aa44ff', Loot: '#44ffaa',
}
const EVENT_SIZES = {
  Position: 2, BotPosition: 2, Kill: 8, Killed: 8,
  BotKill: 6, BotKilled: 6, KilledByStorm: 10, Loot: 5,
}

export default function MapView({ selectedMap, selectedMatch, eventData, heatmapData, activeLayer, showBots, showHumans, playbackTime, setPlaybackTime, isPlaying, setIsPlaying, loading }) {
  const canvasRef = useRef(null)
  const heatCanvasRef = useRef(null)
  const imgRef = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [matchEvents, setMatchEvents] = useState([])
  const [timeRange, setTimeRange] = useState([0, 1])
  const animRef = useRef(null)

  useEffect(() => {
    if (!selectedMatch) { setMatchEvents([]); return }
    const filtered = eventData.filter(e => e.match_id === selectedMatch.match_id)
    filtered.sort((a, b) => a.ts - b.ts)
    console.log('Match events loaded:', filtered.length, 'for match:', selectedMatch.match_id)
    if (filtered.length > 0) {
      const minTs = filtered[0].ts
      const maxTs = filtered[filtered.length - 1].ts
      console.log('Time range:', minTs, '->', maxTs, 'duration:', maxTs - minTs, 'seconds')
      setTimeRange([minTs, maxTs])
      setPlaybackTime(minTs)
    }
    setMatchEvents(filtered)
  }, [selectedMatch, eventData])

  useEffect(() => {
    setImgLoaded(false)
    const img = new Image()
    img.src = MAP_IMAGES[selectedMap]
    img.onload = () => { imgRef.current = img; setImgLoaded(true) }
  }, [selectedMap])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(imgRef.current, 0, 0, size, size)
    if (activeLayer !== 'journeys' || !selectedMatch) return

    const eventsToShow = (playbackTime && matchEvents.length > 0)
      ? matchEvents.filter(e => e.ts <= playbackTime)
      : matchEvents

    console.log('Drawing', eventsToShow.length, 'events, playbackTime:', playbackTime)

    const playerPaths = {}
    eventsToShow.forEach(e => {
      if (e.player_type === 'bot' && !showBots) return
      if (e.player_type === 'human' && !showHumans) return
      if (!playerPaths[e.user_id]) playerPaths[e.user_id] = []
      playerPaths[e.user_id].push(e)
    })

    console.log('Players to draw:', Object.keys(playerPaths).length)

    const scale = size / 1024
    Object.entries(playerPaths).forEach(([uid, events]) => {
      const isBot = events[0].player_type === 'bot'
      const posEvents = events.filter(e => ['Position', 'BotPosition'].includes(e.event))

      if (posEvents.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = isBot ? 'rgba(80,200,80,0.6)' : 'rgba(80,150,255,0.6)'
        ctx.lineWidth = 2
        posEvents.forEach((e, i) => {
          const x = e.px * scale
          const y = e.py * scale
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.stroke()
      }

      events.filter(e => !['Position', 'BotPosition'].includes(e.event)).forEach(e => {
        const x = e.px * scale
        const y = e.py * scale
        const r = Math.max((EVENT_SIZES[e.event] || 5) * scale, 4)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = EVENT_COLORS[e.event] || '#fff'
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    })
  }, [matchEvents, playbackTime, activeLayer, showBots, showHumans, selectedMatch, imgLoaded])

  const drawHeatmap = useCallback(() => {
    const canvas = heatCanvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    ctx.clearRect(0, 0, size, size)
    if (activeLayer === 'journeys') return
    const points = (heatmapData[selectedMap] || {})[activeLayer] || []
    const scale = size / 1024
    const colorMap = { kills: '255,50,50', deaths: '200,50,255', traffic: '50,150,255', loot: '50,255,150' }
    const color = colorMap[activeLayer] || '255,255,255'
    points.forEach(([px, py]) => {
      const x = px * scale
      const y = py * scale
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 20 * scale)
      grad.addColorStop(0, 'rgba(' + color + ',0.2)')
      grad.addColorStop(1, 'rgba(' + color + ',0)')
      ctx.fillStyle = grad
      ctx.fillRect(x - 20 * scale, y - 20 * scale, 40 * scale, 40 * scale)
    })
  }, [heatmapData, selectedMap, activeLayer])

  useEffect(() => {
    if (imgLoaded) { draw(); drawHeatmap() }
  }, [draw, drawHeatmap, imgLoaded])

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    const duration = timeRange[1] - timeRange[0]
    const step = duration / 200
    const tick = () => {
      setPlaybackTime(t => {
        const next = (t ?? timeRange[0]) + step
        if (next >= timeRange[1]) { setIsPlaying(false); return timeRange[1] }
        return next
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, timeRange])

  const size = Math.min(window.innerWidth - 280, window.innerHeight) - 60

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden' }}>
      <div style={{ padding: '8px 16px', background: '#13151f', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 40 }}>
        {activeLayer === 'journeys' ? (
          <>
            {Object.entries(EVENT_COLORS).filter(([k]) => !['Position','BotPosition'].includes(k)).map(([evt, color]) => (
              <div key={evt} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />{evt}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
              <div style={{ width: 20, height: 2, background: 'rgba(80,150,255,0.8)' }} />Human path
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
              <div style={{ width: 20, height: 2, background: 'rgba(80,200,80,0.8)' }} />Bot path
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#aaa' }}>
            Showing <strong style={{ color: '#7ab3ff' }}>{activeLayer}</strong> heatmap for {selectedMap}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {!selectedMatch && activeLayer === 'journeys' && (
          <div style={{ position: 'absolute', color: '#444', fontSize: 14, pointerEvents: 'none', textAlign: 'center' }}>
            Select a match from the sidebar to view player journeys
          </div>
        )}
        <div style={{ position: 'relative', width: size, height: size }}>
          <canvas ref={canvasRef} width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 8 }} />
          <canvas ref={heatCanvasRef} width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 8 }} />
        </div>
      </div>

      {selectedMatch && activeLayer === 'journeys' && (
        <Timeline
          timeRange={timeRange}
          playbackTime={playbackTime}
          setPlaybackTime={setPlaybackTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          matchEvents={matchEvents}
        />
      )}
    </div>
  )
}
