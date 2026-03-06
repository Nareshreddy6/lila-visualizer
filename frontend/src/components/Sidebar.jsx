import { useState } from 'react'

const MAPS = ['AmbroseValley', 'GrandRift', 'Lockdown']
const DATES = ['all', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14']
const LAYERS = [
  { id: 'journeys', label: '🗺 Player Journeys' },
  { id: 'kills',    label: '💀 Kill Heatmap' },
  { id: 'deaths',   label: '☠️ Death Heatmap' },
  { id: 'traffic',  label: '🔥 Traffic Heatmap' },
  { id: 'loot',     label: '📦 Loot Heatmap' },
  { id: 'deadzones',label: '⬛ Dead Zones' },
]
const EVENT_FILTERS = ['all', 'Position', 'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot']

const s = {
  sidebar: { width: 290, background: '#13151f', borderRight: '1px solid #2a2d3e', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '14px 16px', borderBottom: '1px solid #2a2d3e', background: '#0f1117' },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 2 },
  sub: { fontSize: 10, color: '#555', marginTop: 2, letterSpacing: 1 },
  section: { padding: '10px 14px', borderBottom: '1px solid #1e2030' },
  label: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  select: { width: '100%', background: '#1e2130', color: '#ddd', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 8px', fontSize: 12 },
  layerBtn: (active) => ({ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 2, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, background: active ? '#2a3a5c' : 'transparent', color: active ? '#7ab3ff' : '#888', transition: 'all 0.15s' }),
  toggle: (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: `1px solid ${on ? '#2a4a7f' : '#2a2d3e'}`, background: on ? '#1a2a4a' : 'transparent', color: on ? '#7ab3ff' : '#555', cursor: 'pointer', fontSize: 11 }),
  actionBtn: (active) => ({ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 2, borderRadius: 6, border: `1px solid ${active ? '#3a5a3a' : '#2a2d3e'}`, cursor: 'pointer', fontSize: 12, background: active ? '#1a3a1a' : 'transparent', color: active ? '#44ff88' : '#888' }),
  matchList: { flex: 1, overflowY: 'auto', padding: '6px' },
  matchCard: (selected, compare) => ({ padding: '8px 10px', marginBottom: 3, borderRadius: 8, border: `1px solid ${selected ? '#3a5a9a' : compare ? '#3a6a3a' : '#1e2130'}`, background: selected ? '#1a2540' : compare ? '#1a2a1a' : '#141620', cursor: 'pointer', transition: 'all 0.15s' }),
  matchId: { fontSize: 10, color: '#7ab3ff', fontFamily: 'monospace' },
  matchMeta: { fontSize: 10, color: '#555', marginTop: 2 },
  badge: (color) => ({ display: 'inline-block', padding: '1px 5px', borderRadius: 4, fontSize: 9, background: color, color: '#fff', marginRight: 3 }),
  tabs: { display: 'flex', borderBottom: '1px solid #1e2030' },
  tab: (active) => ({ flex: 1, padding: '8px', border: 'none', background: 'transparent', color: active ? '#7ab3ff' : '#555', fontSize: 11, cursor: 'pointer', borderBottom: active ? '2px solid #7ab3ff' : '2px solid transparent' }),
}

export default function Sidebar({
  matches, selectedMap, setSelectedMap, selectedDate, setSelectedDate,
  selectedMatch, setSelectedMatch, compareMatch, setCompareMatch,
  setActiveLayer, showBots, setShowBots, showHumans, setShowHumans,
  activeLayerValue, loading, focusedPlayer, setFocusedPlayer,
  playersData, isAnnotating, setIsAnnotating, filterEventType,
  setFilterEventType, compareMode, setCompareMode, showStats, setShowStats
}) {
  const [tab, setTab] = useState('matches') // matches | players
  const [playerSearch, setPlayerSearch] = useState('')

  const filteredPlayers = Object.values(playersData).filter(p =>
    p.user_id.toLowerCase().includes(playerSearch.toLowerCase())
  ).slice(0, 30)

  return (
    <div style={s.sidebar}>
      <div style={s.header}>
        <div style={s.title}>LILA BLACK</div>
        <div style={s.sub}>LEVEL DESIGN ANALYTICS</div>
      </div>

      {/* Map + Date */}
      <div style={s.section}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={s.label}>Map</div>
            <select style={s.select} value={selectedMap} onChange={e => setSelectedMap(e.target.value)}>
              {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.label}>Date</div>
            <select style={s.select} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
              {DATES.map(d => <option key={d} value={d}>{d === 'all' ? 'All' : d.slice(5)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Layers */}
      <div style={s.section}>
        <div style={s.label}>Layer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {LAYERS.map(l => (
            <button key={l.id} style={s.layerBtn(activeLayerValue === l.id)} onClick={() => setActiveLayer(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player Toggles + Tools */}
      <div style={s.section}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button style={s.toggle(showHumans)} onClick={() => setShowHumans(!showHumans)}>👤 Humans</button>
          <button style={s.toggle(showBots)} onClick={() => setShowBots(!showBots)}>🤖 Bots</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={s.actionBtn(compareMode)} onClick={() => setCompareMode(!compareMode)}>
            {compareMode ? '✅ Compare ON' : '⚖️ Compare'}
          </button>
          <button style={s.actionBtn(isAnnotating)} onClick={() => setIsAnnotating(!isAnnotating)}>
            {isAnnotating ? '✅ Drawing' : '✏️ Annotate'}
          </button>
        </div>
      </div>

      {/* Event Filter */}
      <div style={s.section}>
        <div style={s.label}>Event Filter</div>
        <select style={s.select} value={filterEventType} onChange={e => setFilterEventType(e.target.value)}>
          {EVENT_FILTERS.map(e => <option key={e} value={e}>{e === 'all' ? 'All Events' : e}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(tab === 'matches')} onClick={() => setTab('matches')}>
          Matches ({matches.length})
        </button>
        <button style={s.tab(tab === 'players')} onClick={() => setTab('players')}>
          Players
        </button>
      </div>

      {/* Match List */}
      {tab === 'matches' && (
        <div style={s.matchList}>
          {loading && <div style={{ color: '#444', padding: 12, fontSize: 12 }}>Loading...</div>}
          {!loading && matches.length === 0 && <div style={{ color: '#444', padding: 12, fontSize: 12 }}>No matches found</div>}
          {matches.map(m => {
            const isSelected = selectedMatch?.match_id === m.match_id
            const isCompare = compareMatch?.match_id === m.match_id
            return (
              <div key={m.match_id} style={s.matchCard(isSelected, isCompare)}
                onClick={() => {
                  if (compareMode && selectedMatch && !isSelected) {
                    setCompareMatch(isCompare ? null : m)
                  } else {
                    setSelectedMatch(isSelected ? null : m)
                    setCompareMatch(null)
                  }
                }}>
                <div style={s.matchId}>{m.match_id.slice(0, 16)}…</div>
                <div style={s.matchMeta}>
                  <span style={s.badge('#1a4a8a')}>👤{m.human_count}</span>
                  <span style={s.badge('#1a4a1a')}>🤖{m.bot_count}</span>
                  <span style={{ color: '#444' }}>{m.date?.slice(5)}</span>
                </div>
                <div style={{ ...s.matchMeta, marginTop: 2, display: 'flex', gap: 6 }}>
                  <span>⚔️{m.event_counts?.Kill || 0}</span>
                  <span>🌪️{m.event_counts?.KilledByStorm || 0}</span>
                  <span>📦{m.event_counts?.Loot || 0}</span>
                  {isSelected && (
                    <button onClick={e => { e.stopPropagation(); setShowStats(true) }}
                      style={{ marginLeft: 'auto', background: '#2a3a6a', border: 'none', color: '#7ab3ff', borderRadius: 4, padding: '1px 6px', cursor: 'pointer', fontSize: 9 }}>
                      Stats
                    </button>
                  )}
                </div>
                {isCompare && <div style={{ fontSize: 9, color: '#44ff88', marginTop: 2 }}>COMPARE B</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Player List */}
      {tab === 'players' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '8px' }}>
            <input
              placeholder="Search player ID..."
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              style={{ width: '100%', background: '#1e2130', color: '#ddd', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 8px', fontSize: 11, boxSizing: 'border-box' }}
            />
          </div>
          <div style={s.matchList}>
            {filteredPlayers.map(p => (
              <div key={p.user_id}
                style={{ ...s.matchCard(focusedPlayer === p.user_id, false), marginBottom: 3 }}
                onClick={() => setFocusedPlayer(focusedPlayer === p.user_id ? null : p.user_id)}>
                <div style={{ ...s.matchId, color: '#aaa' }}>{p.user_id.slice(0, 16)}…</div>
                <div style={s.matchMeta}>
                  {p.matches_played} matches · {p.total_events} events
                </div>
                <div style={s.matchMeta}>{p.maps_played.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
