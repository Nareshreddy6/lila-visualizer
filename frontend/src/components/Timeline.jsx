export default function Timeline({ timeRange, playbackTime, setPlaybackTime, isPlaying, setIsPlaying, matchEvents }) {
  const [min, max] = timeRange
  const duration = max - min || 1
  const pct = Math.round(((playbackTime ?? min) - min) / duration * 100)
  const combatEvents = matchEvents.filter(e => !['Position', 'BotPosition'].includes(e.event))
  return (
    <div style={{ background: '#13151f', borderTop: '1px solid #2a2d3e', padding: '10px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <button onClick={() => setIsPlaying(!isPlaying)}
          style={{ background: '#2a3a6a', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 16 }}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={() => { setIsPlaying(false); setPlaybackTime(min) }}
          style={{ background: '#1e2130', border: 'none', color: '#888', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
          ↺
        </button>
        <span style={{ fontSize: 12, color: '#7ab3ff', fontFamily: 'monospace', fontWeight: 600 }}>
          {pct}% complete
        </span>
        <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>
          {combatEvents.filter(e => e.ts <= (playbackTime ?? min)).length} / {combatEvents.length} combat events
        </span>
      </div>
      <div style={{ position: 'relative', height: 24 }}>
        {combatEvents.map((e, i) => {
          const p = ((e.ts - min) / duration) * 100
          const colors = { Kill: '#ff4444', Killed: '#ff8844', KilledByStorm: '#aa44ff', Loot: '#44ffaa', BotKill: '#ffaa00', BotKilled: '#ff6600' }
          return (
            <div key={i} style={{ position: 'absolute', bottom: 8, left: p + '%', width: 3, height: 8, background: colors[e.event] || '#888', borderRadius: 1, transform: 'translateX(-50%)', opacity: 0.8 }} />
          )
        })}
        <input type="range" min={min} max={max} step={1}
          value={playbackTime ?? min}
          onChange={e => { setIsPlaying(false); setPlaybackTime(Number(e.target.value)) }}
          style={{ width: '100%', position: 'absolute', top: 0, left: 0, accentColor: '#4488ff', cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}
