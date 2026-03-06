import pyarrow.parquet as pq
import pandas as pd
import os
import json
from collections import defaultdict

BASE_PATH = r"C:\Users\nares\Desktop\lila-visualizer\data\player_data"
OUTPUT_PATH = r"C:\Users\nares\Desktop\lila-visualizer\frontend\public"

DAY_FOLDERS = {
    "February_10": "2026-02-10",
    "February_11": "2026-02-11",
    "February_12": "2026-02-12",
    "February_13": "2026-02-13",
    "February_14": "2026-02-14",
}

MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift":     {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown":      {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

def world_to_pixel(x, z, map_id):
    cfg = MAP_CONFIG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    px = round(u * 1024, 2)
    py = round((1 - v) * 1024, 2)
    return px, py

def is_bot(user_id):
    return str(user_id).strip().isdigit()

def clean_match_id(match_id):
    s = str(match_id).replace('.nakama-0', '').strip()
    if s.endswith('.0'):
        s = s[:-2]
    return s

def load_all_data():
    all_records = []
    print("Loading all files...")
    for folder, date_str in DAY_FOLDERS.items():
        folder_path = os.path.join(BASE_PATH, folder)
        if not os.path.exists(folder_path):
            continue
        files = os.listdir(folder_path)
        print(f"  {folder}: {len(files)} files")
        for fname in files:
            fpath = os.path.join(folder_path, fname)
            try:
                df = pq.read_table(fpath).to_pandas()
                df['event'] = df['event'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else str(x))
                df['user_id'] = df['user_id'].astype(str)
                df['match_id'] = df['match_id'].astype(str)
                df['map_id'] = df['map_id'].astype(str)
                df['date'] = date_str
                df['player_type'] = df['user_id'].apply(lambda uid: 'bot' if is_bot(uid) else 'human')
                df['match_id_clean'] = df['match_id'].apply(clean_match_id)
                # Convert ts to ms since epoch for ordering
                df['ts_ms'] = df['ts'].apply(
                    lambda t: int(t.value // 1_000_000) if hasattr(t, 'value') else int(float(t))
                )
                all_records.append(df)
            except Exception as e:
                print(f"    Skipped {fname}: {e}")
    print("Combining...")
    return pd.concat(all_records, ignore_index=True)

def build_events(df, map_id):
    """
    Build events with a synthetic timeline (0-1000) per match.
    Since all events in a match have nearly identical ts values,
    we use row order to create a meaningful playback timeline.
    """
    events = []
    skipped = 0

    # Process per match to assign synthetic timeline
    for match_id, match_df in df.groupby('match_id_clean'):
        match_df = match_df.sort_values('ts_ms').reset_index(drop=True)
        n = len(match_df)

        for i, row in match_df.iterrows():
            try:
                px, py = world_to_pixel(float(row['x']), float(row['z']), map_id)
                # Synthetic timeline: 0 to 1000 based on row position
                synthetic_ts = int((match_df.index.get_loc(i) / max(n - 1, 1)) * 1000)
                events.append({
                    "user_id": str(row['user_id']),
                    "match_id": str(match_id),
                    "map_id": str(row['map_id']),
                    "px": px,
                    "py": py,
                    "ts": synthetic_ts,
                    "event": str(row['event']),
                    "date": str(row['date']),
                    "player_type": str(row['player_type']),
                })
            except:
                skipped += 1

    print(f"  {map_id}: {len(events)} events, {skipped} skipped")
    return events

def build_match_index(df):
    matches = []
    for match_id, group in df.groupby('match_id_clean'):
        map_id = str(group['map_id'].iloc[0])
        date = str(group['date'].iloc[0])
        humans = int(group[group['player_type'] == 'human']['user_id'].nunique())
        bots = int(group[group['player_type'] == 'bot']['user_id'].nunique())
        event_counts = {str(k): int(v) for k, v in group['event'].value_counts().to_dict().items()}
        total = int(len(group))
        matches.append({
            "match_id": str(match_id),
            "map_id": map_id,
            "date": date,
            "human_count": humans,
            "bot_count": bots,
            "total_events": total,
            "event_counts": event_counts,
            "duration_sec": total,  # use event count as proxy for match size
        })
    matches.sort(key=lambda m: (m['date'], m['match_id']))
    return matches

def build_heatmap_data(df):
    heatmaps = defaultdict(lambda: defaultdict(list))
    categories = {
        "kills":   ["Kill", "BotKill"],
        "deaths":  ["Killed", "BotKilled", "KilledByStorm"],
        "traffic": ["Position", "BotPosition"],
        "loot":    ["Loot"],
    }
    for map_id in df['map_id'].unique():
        map_id = str(map_id)
        if map_id not in MAP_CONFIG:
            continue
        map_df = df[df['map_id'] == map_id]
        for category, event_types in categories.items():
            cat_df = map_df[map_df['event'].isin(event_types)]
            if category == "traffic":
                cat_df = cat_df.iloc[::5]
            points = []
            for _, row in cat_df.iterrows():
                try:
                    px, py = world_to_pixel(float(row['x']), float(row['z']), map_id)
                    points.append([px, py])
                except:
                    continue
            heatmaps[map_id][category] = points
            print(f"  {map_id}/{category}: {len(points)} points")
    return heatmaps

def main():
    os.makedirs(OUTPUT_PATH, exist_ok=True)
    df = load_all_data()
    print(f"\nTotal rows: {len(df):,}")

    print("\nBuilding match index...")
    matches = build_match_index(df)
    with open(os.path.join(OUTPUT_PATH, "matches.json"), "w") as f:
        json.dump(matches, f)
    print(f"  Saved {len(matches)} matches")

    print("\nBuilding heatmaps...")
    heatmaps = build_heatmap_data(df)
    with open(os.path.join(OUTPUT_PATH, "heatmaps.json"), "w") as f:
        json.dump({k: dict(v) for k, v in heatmaps.items()}, f)

    print("\nBuilding events per map...")
    for map_id in ["AmbroseValley", "GrandRift", "Lockdown"]:
        map_df = df[df['map_id'] == map_id]
        if len(map_df) == 0:
            continue
        events = build_events(map_df, map_id)
        with open(os.path.join(OUTPUT_PATH, f"events_{map_id}.json"), "w") as f:
            json.dump(events, f)

    with open(os.path.join(OUTPUT_PATH, "map_config.json"), "w") as f:
        json.dump(MAP_CONFIG, f)

    print("\n✅ Done!")

    # Verify
    print("\n--- Verification: best match ---")
    e = json.load(open(os.path.join(OUTPUT_PATH, "events_AmbroseValley.json")))
    m = json.load(open(os.path.join(OUTPUT_PATH, "matches.json")))
    good = [x for x in m if x['map_id'] == 'AmbroseValley' and x['human_count'] >= 2 and x['total_events'] >= 50]
    good.sort(key=lambda x: x['total_events'], reverse=True)
    if good:
        best = good[0]
        mid = best['match_id']
        evts = [x for x in e if x['match_id'] == mid]
        pos = [x for x in evts if x['event'] in ['Position', 'BotPosition']]
        ts_vals = [x['ts'] for x in evts]
        print(f"Match: {mid}")
        print(f"Events: {len(evts)} | Positions: {len(pos)}")
        print(f"Humans: {best['human_count']} | Bots: {best['bot_count']}")
        print(f"TS range: {min(ts_vals)} -> {max(ts_vals)}")
        print(f"Players: {set(x['user_id'] for x in evts)}")
        print(f"\n✅ Search for '{mid[:18]}' in the sidebar and click it!")

if __name__ == "__main__":
    main()
