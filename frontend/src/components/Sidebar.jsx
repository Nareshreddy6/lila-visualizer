const MAPS = ['AmbroseValley', 'GrandRift', 'Lockdown']
const DATES = ['all', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14']
const LAYERS = [
  { id: 'journeys', label: '🗺 Player Journeys' },
  { id: 'kills',    label: '💀 Kill Heatmap' },
  { id: 'deaths',   label: '☠️ Death Heatmap' },
  { id: 'traffic',  label: '🔥 Traffic Heatmap' },
  { id: 'loot',     label: '📦 Loot Heatmap' },
]
const s = {
  sidebar: { width: 280, background: '#13151f', borderRight: '1px solid #2a2d3e', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '16px', borderBottom: '1px solid #2a2d3e' },
  title: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 1 },
  sub: { fontSize: 11, color: '#666', marginTop: 2 },
  section: { padding: '12px 16px', borderBottom: '1px solid #1e2030' },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  select: { width: '100%', background: '#1e2130', color: '#ddd', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 8px', fontSize: 13 },
  layerBtn: (active) => ({ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 3, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, background: active ? '#2a3a5c' : 'transparent', color: active ? '#7ab3ff' : '#aaa', transition: 'all 0.15s' }),
  toggle: (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 6, border: '1px solid ' + (on ? '#2a4a7f' : '#2a2d3e'), background: on ? '#1a2a4a' : 'transparent', color: on ? '#7ab3ff' : '#666', cursor: 'pointer', fontSize: 12 }),
  matchList: { flex: 1, overflowY: 'auto', padding: '8px' },
  matchCard: (selected) => ({ padding: '10px 12px', marginBottom: 4, borderRadius: 8, border: '1px solid ' + (selected ? '#3a5a9a' : '#2a2d3e'), background: selected ? '#1a2540' : '#1a1d2a', cursor: 'pointer', transition: 'all 0.15s' }),
  matchId: { fontSize: 11, color: '#7ab3ff', fontFamily: 'monospace' },
  matchMeta: { fontSize: 11, color: '#666', marginTop: 3 },
  badge: (color) => ({ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10, background: color, color: '#fff', marginRight: 4 }),
}
export default function Sidebar({ matches, selectedMap, setSelectedMap, selectedDate, setSelectedDate, selectedMatch, setSelectedMatch, setActiveLayer, showBots, setShowBots, showHumans, setShowHumans, activeLayerValue, loading }) {
  return (
    <div style={s.sidebar}>
      <div style={s.header}>
        <div style={s.title}>LILA BLACK</div>
        <div style={s.sub}>Level Design Analytics</div>
      </div>
      <div style={s.section}>
        <div style={s.label}>Map</div>
        <select style={s.select} value={selectedMap} onChange={e => setSelectedMap(e.target.value)}>
          {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div style={s.section}>
        <div style={s.label}>Date</div>
        <select style={s.select} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
          {DATES.map(d => <option key={d} value={d}>{d === 'all' ? 'All Dates' : d}</option>)}
        </select>
      </div>
      <div style={s.section}>
        <div style={s.label}>Layer</div>
        {LAYERS.map(l => (
          <button key={l.id} style={s.layerBtn(activeLayerValue === l.id)} onClick={() => setActiveLayer(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <div style={s.section}>
        <div style={s.label}>Show Players</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.toggle(showHumans)} onClick={() => setShowHumans(!showHumans)}>👤 Humans</button>
          <button style={s.toggle(showBots)} onClick={() => setShowBots(!showBots)}>🤖 Bots</button>
        </div>
      </div>
      <div style={{ padding: '8px 16px 4px', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
        Matches ({matches.length})
      </div>
      <div style={s.matchList}>
        {loading && <div style={{ color: '#555', padding: 12, fontSize: 13 }}>Loading...</div>}
        {!loading && matches.length === 0 && <div style={{ color: '#555', padding: 12, fontSize: 13 }}>No matches found</div>}
        {matches.map(m => (
          <div key={m.match_id} style={s.matchCard(selectedMatch?.match_id === m.match_id)} onClick={() => setSelectedMatch(selectedMatch?.match_id === m.match_id ? null : m)}>
            <div style={s.matchId}>{m.match_id.slice(0, 18)}…</div>
            <div style={s.matchMeta}>
              <span style={s.badge('#2255aa')}>👤 {m.human_count}</span>
              <span style={s.badge('#446622')}>🤖 {m.bot_count}</span>
              {m.date}
            </div>
            <div style={{ ...s.matchMeta, marginTop: 2 }}>
              {m.event_counts['Kill'] || 0} kills · {m.event_counts['KilledByStorm'] || 0} storm
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
