import json

# Check events
data = json.load(open('frontend/public/events_AmbroseValley.json'))
print("Total events:", len(data))
print("Sample event:", data[0])
print("Sample event 2:", data[1])

# Group by match
matches = {}
for e in data:
    mid = e['match_id']
    if mid not in matches:
        matches[mid] = {'events': 0, 'positions': 0, 'players': set()}
    matches[mid]['events'] += 1
    matches[mid]['players'].add(e['user_id'])
    if e['event'] in ['Position', 'BotPosition']:
        matches[mid]['positions'] += 1

# Top 5 by positions
sorted_m = sorted(matches.items(), key=lambda x: x[1]['positions'], reverse=True)
print("\nTop 5 matches by position count:")
for mid, info in sorted_m[:5]:
    print("Match:", mid[:18], "| events:", info['events'], "| positions:", info['positions'], "| players:", len(info['players']))

# Also check matches.json for best matches
mdata = json.load(open('frontend/public/matches.json'))
good = [m for m in mdata if m['map_id'] == 'AmbroseValley' and m['human_count'] >= 3]
good.sort(key=lambda m: m['human_count'] + m.get('event_counts', {}).get('Kill', 0), reverse=True)
print("\nTop 5 matches by human count:")
for m in good[:5]:
    kills = m.get('event_counts', {}).get('Kill', 0)
    print("Match:", m['match_id'][:18], "| humans:", m['human_count'], "| bots:", m['bot_count'], "| kills:", kills, "| date:", m['date'])
