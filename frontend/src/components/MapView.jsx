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
  Position: 2, BotPosition: 2, Kill: 9, Killed: 9,
  BotKill: 7, BotKilled: 7, KilledByStorm: 11, Loot: 6,
}
const PLAYER_COLORS = [
  '#4488ff','#ff4444','#44ffaa','#ffaa00','#aa44ff',
  '#ff88aa','#44aaff','#aaff44','#ff44aa','#44ffff',
  '#ffff44','#ff8800','#8844ff','#44ff88','#ff4488',
]

export default function MapView({
  selectedMap, selectedMatch, compareMatch, eventData, heatmapData, deadZoneData,
  activeLayer, showBots, showHumans, playbackTime, setPlaybackTime,
  isPlaying, setIsPlaying, loading, focusedPlayer, setFocusedPlayer,
  annotations, setAnnotations, isAnnotating, filterEventType, compareMode
}) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [matchEvents, setMatchEvents] = useState([])
  const [compareEvents, setCompareEvents] = useState([])
  const [timeRange, setTimeRange] = useState([0, 1000])
  const [canvasSize, setCanvasSize] = useState(500)
  const animRef = useRef(null)
  const playerColorMap = useRef({})

  // Responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      const sidebarWidth = 290
      const legendHeight = 36
      const timelineHeight = selectedMatch && activeLayer === 'journeys' ? 70 : 0
      const availW = window.innerWidth - sidebarWidth - 32
      const availH = window.innerHeight - legendHeight - timelineHeight - 32
      const size = Math.max(300, Math.min(availW, availH))
      setCanvasSize(size)
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [selectedMatch, activeLayer])

  // Load match events
  useEffect(() => {
    if (!selectedMatch) { setMatchEvents([]); return }
    const filtered = eventData.filter(e => e.match_id === selectedMatch.match_id)
    filtered.sort((a, b) => a.ts - b.ts)
    if (filtered.length > 0) {
      setTimeRange([filtered[0].ts, filtered[filtered.length - 1].ts])
      setPlaybackTime(filtered[0].ts)
      const players = [...new Set(filtered.map(e => e.user_id))]
      const colorMap = {}
      players.forEach((uid, i) => { colorMap[uid] = PLAYER_COLORS[i % PLAYER_COLORS.length] })
      playerColorMap.current = colorMap
    }
    setMatchEvents(filtered)
  }, [selectedMatch, eventData])

  // Load compare events
  useEffect(() => {
    if (!compareMatch) { setCompareEvents([]); return }
    const filtered = eventData.filter(e => e.match_id === compareMatch.match_id)
    filtered.sort((a, b) => a.ts - b.ts)
    setCompareEvents(filtered)
  }, [compareMatch, eventData])

  // Load map image
  useEffect(() => {
    setImgLoaded(false)
    const img = new Image()
    img.src = MAP_IMAGES[selectedMap]
    img.onload = () => { imgRef.current = img; setImgLoaded(true) }
  }, [selectedMap])

  // Draw everything
  useEffect(() => {
    if (!imgLoaded) return
    const canvas = canvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    ctx.clearRect(0, 0, size, size)
    ctx.globalAlpha = 1

    if (compareMode && compareMatch) {
      const half = size / 2
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, half, size); ctx.clip()
      ctx.drawImage(imgRef.current, 0, 0, half, size)
      ctx.restore()
      ctx.save(); ctx.beginPath(); ctx.rect(half, 0, half, size); ctx.clip()
      ctx.drawImage(imgRef.current, half, 0, half, size)
      ctx.restore()
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(half, 0); ctx.lineTo(half, size); ctx.stroke()
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(100,160,255,0.9)'; ctx.fillText('Match A', 8, 16)
      ctx.fillStyle = 'rgba(100,255,160,0.9)'; ctx.fillText('Match B', half + 8, 16)
      if (activeLayer === 'journeys') {
        renderJourneys(ctx, matchEvents, size, 0)
        renderJourneys(ctx, compareEvents, size, half)
      }
    } else {
      ctx.drawImage(imgRef.current, 0, 0, size, size)
      if (activeLayer === 'journeys') {
        if (selectedMatch) renderJourneys(ctx, matchEvents, size, 0)
      } else if (activeLayer === 'deadzones') {
        renderDeadZones(ctx, size)
      } else {
        renderHeatmap(ctx, size)
      }
      renderAnnotations(ctx, size)
    }

    function renderJourneys(ctx, events, size, xOffset) {
      const eventsToShow = playbackTime != null
        ? events.filter(e => e.ts <= playbackTime)
        : events

      const playerPaths = {}
      eventsToShow.forEach(e => {
        if (e.player_type === 'bot' && !showBots) return
        if (e.player_type === 'human' && !showHumans) return
        if (focusedPlayer && e.user_id !== focusedPlayer) return
        if (filterEventType !== 'all' && e.event !== filterEventType) return
        if (!playerPaths[e.user_id]) playerPaths[e.user_id] = []
        playerPaths[e.user_id].push(e)
      })

      const scale = size / 1024

      Object.entries(playerPaths).forEach(([uid, pevents]) => {
        const isBot = pevents[0].player_type === 'bot'
        const color = playerColorMap.current[uid] || (isBot ? '#44aa44' : '#4488ff')
        const isFocused = focusedPlayer === uid
        const dimmed = focusedPlayer && !isFocused
        const posEvents = pevents.filter(e => ['Position', 'BotPosition'].includes(e.event))

        if (posEvents.length > 1) {
          ctx.beginPath()
          ctx.globalAlpha = dimmed ? 0.08 : isFocused ? 0.95 : isBot ? 0.4 : 0.6
          ctx.strokeStyle = color
          ctx.lineWidth = isFocused ? 2.5 : 1.5
          posEvents.forEach((e, i) => {
            const x = e.px * scale + xOffset
            const y = e.py * scale
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          })
          ctx.stroke()
          // Start dot
          ctx.globalAlpha = dimmed ? 0.1 : 0.85
          ctx.beginPath()
          ctx.arc(posEvents[0].px * scale + xOffset, posEvents[0].py * scale, 4 * scale, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }

        // Combat/loot events
        pevents.filter(e => !['Position','BotPosition'].includes(e.event)).forEach(e => {
          const x = e.px * scale + xOffset
          const y = e.py * scale
          const r = Math.max((EVENT_SIZES[e.event] || 5) * scale, 4)
          ctx.globalAlpha = dimmed ? 0.1 : 0.9
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fillStyle = EVENT_COLORS[e.event] || '#fff'
          ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.6)'
          ctx.lineWidth = 1
          ctx.stroke()
        })
      })
      ctx.globalAlpha = 1
    }

    function renderHeatmap(ctx, size) {
      const points = (heatmapData[selectedMap] || {})[activeLayer] || []
      const scale = size / 1024
      const colorMap = { kills:'255,50,50', deaths:'200,50,255', traffic:'50,150,255', loot:'50,255,150' }
      const color = colorMap[activeLayer] || '255,255,255'
      points.forEach(([px, py]) => {
        const x = px * scale, y = py * scale
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 22 * scale)
        grad.addColorStop(0, `rgba(${color},0.22)`)
        grad.addColorStop(1, `rgba(${color},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(x - 22*scale, y - 22*scale, 44*scale, 44*scale)
      })
    }

    function renderDeadZones(ctx, size) {
      const zoneData = deadZoneData[selectedMap]
      if (!zoneData) return
      const scale = size / 1024
      const cellSize = zoneData.grid_size * scale
      zoneData.dead.forEach(([px, py]) => {
        ctx.fillStyle = 'rgba(180,0,0,0.35)'
        ctx.fillRect((px - zoneData.grid_size/2)*scale, (py - zoneData.grid_size/2)*scale, cellSize, cellSize)
      })
      if (zoneData.hot?.length > 0) {
        const maxCount = Math.max(...zoneData.hot.map(h => h[2]))
        zoneData.hot.forEach(([px, py, count]) => {
          ctx.fillStyle = `rgba(255,220,0,${(count/maxCount)*0.4})`
          ctx.fillRect((px - zoneData.grid_size/2)*scale, (py - zoneData.grid_size/2)*scale, cellSize, cellSize)
        })
      }
      ctx.font = '13px monospace'
      ctx.fillStyle = 'rgba(255,80,80,0.95)'
      ctx.fillText(`Dead zones: ${zoneData.dead_cell_count} cells`, 12, 22)
      ctx.fillStyle = 'rgba(255,220,0,0.95)'
      ctx.fillText(`Hot zones: ${zoneData.hot?.length || 0} cells`, 12, 40)
    }

    function renderAnnotations(ctx, size) {
      const scale = size / 1024
      annotations.forEach(ann => {
        ctx.beginPath()
        ctx.arc(ann.px * scale, ann.py * scale, ann.radius * scale, 0, Math.PI * 2)
        ctx.strokeStyle = '#ffff44'
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.8
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,0,0.08)'
        ctx.fill()
        ctx.globalAlpha = 1
        if (ann.label) {
          ctx.font = '11px sans-serif'
          ctx.fillStyle = '#ffff44'
          ctx.fillText(ann.label, ann.px * scale + ann.radius * scale + 4, ann.py * scale)
        }
      })
    }

  }, [matchEvents, compareEvents, playbackTime, activeLayer, showBots, showHumans,
      selectedMatch, compareMatch, compareMode, imgLoaded, focusedPlayer,
      filterEventType, heatmapData, deadZoneData, annotations, selectedMap, canvasSize])

  // Playback
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    const step = (timeRange[1] - timeRange[0]) / 200
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

  // Click handler
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scale = 1024 / canvas.width
    const mx = (e.clientX - rect.left) * scale
    const my = (e.clientY - rect.top) * scale

    if (isAnnotating) {
      const label = prompt('Label for this zone (optional):') || ''
      setAnnotations(prev => [...prev, { px: mx, py: my, radius: 40, label, id: Date.now() }])
      return
    }

    if (activeLayer === 'journeys' && selectedMatch) {
      let closest = null, minDist = 25
      matchEvents.forEach(ev => {
        const dist = Math.sqrt((ev.px - mx) ** 2 + (ev.py - my) ** 2)
        if (dist < minDist) { minDist = dist; closest = ev.user_id }
      })
      if (closest) setFocusedPlayer(focusedPlayer === closest ? null : closest)
    }
  }, [isAnnotating, activeLayer, selectedMatch, matchEvents, focusedPlayer, setFocusedPlayer, setAnnotations])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden', height: '100%' }}>
      {/* Legend */}
      <div style={{ padding: '6px 14px', background: '#13151f', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', minHeight: 36, flexShrink: 0 }}>
        {activeLayer === 'journeys' ? (
          <>
            {Object.entries(EVENT_COLORS).filter(([k]) => !['Position','BotPosition'].includes(k)).map(([evt, color]) => (
              <div key={evt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#777' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{evt}
              </div>
            ))}
            <div style={{ width: 1, height: 20, background: '#2a2d3e', margin: '0 4px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#777' }}>
                <div style={{ width: 16, height: 2, background: 'rgba(80,150,255,0.7)' }} />Human path
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#777' }}>
                <div style={{ width: 16, height: 2, background: 'rgba(80,200,80,0.7)' }} />Bot path
            </div>
            <div style={{ width: 1, height: 20, background: '#2a2d3e', margin: '0 4px' }} />
            <div style={{ fontSize: 10, color: '#555' }}>● = start position</div>
             {selectedMatch && Object.entries(playerColorMap.current).slice(0, 6).map(([uid, color]) => (
             <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color }}>
             <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
             {uid.slice(0, 8)}…
            </div>
             ))}
            {focusedPlayer && (
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#ffaa44', background: '#1a1000', padding: '2px 8px', borderRadius: 4 }}>
                👁 {focusedPlayer.slice(0,8)}…
                <button onClick={() => setFocusedPlayer(null)} style={{ background: 'none', border: 'none', color: '#ff6644', cursor: 'pointer', fontSize: 11, marginLeft: 4 }}>✕</button>
              </div>
            )}
            {isAnnotating && (
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#ffff44', background: '#111100', padding: '2px 8px', borderRadius: 4 }}>
                ✏️ Click map to annotate
              </div>
            )}
          </>
        ) : activeLayer === 'deadzones' ? (
          <div style={{ fontSize: 11, color: '#aaa' }}>
            <span style={{ color: '#ff5050' }}>■</span> Never visited &nbsp;
            <span style={{ color: '#ffdd00' }}>■</span> High traffic
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#aaa' }}>
            Showing <strong style={{ color: '#7ab3ff' }}>{activeLayer}</strong> heatmap — {selectedMap}
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 8 }}>
        {!selectedMatch && activeLayer === 'journeys' && (
          <div style={{ position: 'absolute', color: '#333', fontSize: 13, pointerEvents: 'none' }}>
            ← Select a match to view player journeys
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{ borderRadius: 8, cursor: isAnnotating ? 'crosshair' : 'pointer', maxWidth: '100%', maxHeight: '100%' }}
          onClick={handleClick}
        />
      </div>

      {/* Timeline - always visible at bottom */}
      {selectedMatch && activeLayer === 'journeys' && (
        <div style={{ flexShrink: 0 }}>
          <Timeline
            timeRange={timeRange}
            playbackTime={playbackTime}
            setPlaybackTime={setPlaybackTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            matchEvents={matchEvents}
            playerColorMap={playerColorMap.current}
            focusedPlayer={focusedPlayer}
          />
        </div>
      )}
    </div>
  )
}
