export default function StatsPanel({ selectedMatch, eventData, onClose }) {
  if (!selectedMatch) return null

  const events = eventData.filter(e => e.match_id === selectedMatch.match_id)
  const humans = events.filter(e => e.player_type === 'human')
  const bots = events.filter(e => e.player_type === 'bot')

  const kills = events.filter(e => e.event === 'Kill').length
  const deaths = events.filter(e => e.event === 'Killed').length
  const botKills = events.filter(e => e.event === 'BotKill').length
  const botDeaths = events.filter(e => e.event === 'BotKilled').length
  const stormDeaths = events.filter(e => e.event === 'KilledByStorm').length
  const loots = events.filter(e => e.event === 'Loot').length

  // Per player breakdown
  const playerStats = {}
  events.forEach(e => {
    if (!playerStats[e.user_id]) {
      playerStats[e.user_id] = { uid: e.user_id, type: e.player_type, kills: 0, deaths: 0, loot: 0, storm: 0, botKills: 0 }
    }
    if (e.event === 'Kill') playerStats[e.user_id].kills++
    if (e.event === 'Killed') playerStats[e.user_id].deaths++
    if (e.event === 'Loot') playerStats[e.user_id].loot++
    if (e.event === 'KilledByStorm') playerStats[e.user_id].storm++
    if (e.event === 'BotKill') playerStats[e.user_id].botKills++
  })

  const humanPlayers = Object.values(playerStats).filter(p => p.type === 'human')

  const s = {
    panel: { background: '#13151f', borderTop: '2px solid #2a2d3e', padding: '12px 16px', maxHeight: 220, overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 12, fontWeight: 700, color: '#7ab3ff', letterSpacing: 1 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 10 },
    stat: { background: '#1a1d2a', borderRadius: 6, padding: '8px', textAlign: 'center' },
    statVal: { fontSize: 18, fontWeight: 700, color: '#fff' },
    statLabel: { fontSize: 9, color: '#555', marginTop: 2, textTransform: 'uppercase' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
    th: { color: '#555', padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #1e2030', fontSize: 10 },
    td: { color: '#aaa', padding: '4px 8px', borderBottom: '1px solid #141620' },
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.title}>📊 MATCH STATS — {selectedMatch.match_id.slice(0, 18)}…</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <div style={s.grid}>
        {[
          { val: kills, label: 'PvP Kills', color: '#ff4444' },
          { val: deaths, label: 'PvP Deaths', color: '#ff8844' },
          { val: botKills, label: 'Bot Kills', color: '#ffaa00' },
          { val: botDeaths, label: 'Bot Deaths', color: '#ff6600' },
          { val: stormDeaths, label: 'Storm Deaths', color: '#aa44ff' },
          { val: loots, label: 'Loot Events', color: '#44ffaa' },
        ].map(({ val, label, color }) => (
          <div key={label} style={s.stat}>
            <div style={{ ...s.statVal, color }}>{val}</div>
            <div style={s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {humanPlayers.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Human Player Breakdown</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Player</th>
                <th style={s.th}>PvP K</th>
                <th style={s.th}>Deaths</th>
                <th style={s.th}>Bot K</th>
                <th style={s.th}>Storm</th>
                <th style={s.th}>Loot</th>
              </tr>
            </thead>
            <tbody>
              {humanPlayers.map(p => (
                <tr key={p.uid}>
                  <td style={{ ...s.td, color: '#7ab3ff', fontFamily: 'monospace' }}>{p.uid.slice(0, 12)}…</td>
                  <td style={{ ...s.td, color: '#ff4444' }}>{p.kills}</td>
                  <td style={{ ...s.td, color: '#ff8844' }}>{p.deaths}</td>
                  <td style={{ ...s.td, color: '#ffaa00' }}>{p.botKills}</td>
                  <td style={{ ...s.td, color: '#aa44ff' }}>{p.storm}</td>
                  <td style={{ ...s.td, color: '#44ffaa' }}>{p.loot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
