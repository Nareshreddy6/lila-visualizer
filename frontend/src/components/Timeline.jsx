export default function Timeline({ timeRange, playbackTime, setPlaybackTime, isPlaying, setIsPlaying, matchEvents, playerColorMap, focusedPlayer }) {
  const [min, max] = timeRange
  const duration = max - min || 1
  const pct = Math.round(((playbackTime ?? min) - min) / duration * 100)
  const combatEvents = matchEvents.filter(e => !['Position', 'BotPosition'].includes(e.event))
  const shownCombat = combatEvents.filter(e => e.ts <= (playbackTime ?? min))

  return (
    <div style={{ background: '#0d0f18', borderTop: '1px solid #1e2030', padding: '8px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
        <button onClick={() => setIsPlaying(!isPlaying)}
          style={{ background: '#1a2a5a', border: '1px solid #2a3a6a', color: '#7ab3ff', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 15, minWidth: 36 }}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={() => { setIsPlaying(false); setPlaybackTime(min) }}
          style={{ background: 'transparent', border: '1px solid #2a2d3e', color: '#555', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
          ↺
        </button>
        <div style={{ fontSize: 13, color: '#7ab3ff', fontWeight: 600, fontFamily: 'monospace' }}>
          {pct}%
        </div>
        <div style={{ fontSize: 10, color: '#444' }}>
          {shownCombat.length}/{combatEvents.length} events
        </div>

        {/* Player color legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(playerColorMap).slice(0, 8).map(([uid, color]) => (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: focusedPlayer === uid ? color : '#555' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, opacity: focusedPlayer && focusedPlayer !== uid ? 0.3 : 1 }} />
              {uid.slice(0, 6)}
            </div>
          ))}
        </div>
      </div>

      {/* Scrubber */}
      <div style={{ position: 'relative', height: 20 }}>
        {combatEvents.map((e, i) => {
          const p = ((e.ts - min) / duration) * 100
          const colors = { Kill: '#ff4444', Killed: '#ff8844', KilledByStorm: '#aa44ff', Loot: '#44ffaa', BotKill: '#ffaa00', BotKilled: '#ff6600' }
          return (
            <div key={i} title={e.event} style={{
              position: 'absolute', bottom: 6, left: p + '%',
              width: 3, height: 8,
              background: colors[e.event] || '#888',
              borderRadius: 1, transform: 'translateX(-50%)',
              opacity: e.ts <= (playbackTime ?? min) ? 1 : 0.3
            }} />
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
