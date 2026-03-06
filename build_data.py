import pyarrow.parquet as pq
import pandas as pd
import os
import json
from collections import defaultdict
import math

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

def ts_to_ms(ts_val):
    if hasattr(ts_val, 'value'):
        return int(ts_val.value // 1_000_000)
    if hasattr(ts_val, 'timestamp'):
        return int(ts_val.timestamp() * 1000)
    v = float(ts_val)
    if v < 2e10:
        return int(v * 1000)
    return int(v)

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
                df['ts_ms'] = df['ts'].apply(ts_to_ms)
                all_records.append(df)
            except Exception as e:
                print(f"    Skipped {fname}: {e}")
    print("Combining...")
    return pd.concat(all_records, ignore_index=True)

def build_events(df, map_id):
    events = []
    skipped = 0
    for match_id, match_df in df.groupby('match_id_clean'):
        match_df = match_df.sort_values('ts_ms').reset_index(drop=True)
        n = len(match_df)
        for idx, (_, row) in enumerate(match_df.iterrows()):
            try:
                px, py = world_to_pixel(float(row['x']), float(row['z']), map_id)
                synthetic_ts = int((idx / max(n - 1, 1)) * 1000)
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
        
        # Per player stats
        player_stats = []
        for uid, pgroup in group.groupby('user_id'):
            ptype = 'bot' if is_bot(uid) else 'human'
            pevents = {str(k): int(v) for k, v in pgroup['event'].value_counts().to_dict().items()}
            player_stats.append({
                "user_id": str(uid),
                "player_type": ptype,
                "event_counts": pevents,
                "total_events": int(len(pgroup)),
            })

        matches.append({
            "match_id": str(match_id),
            "map_id": map_id,
            "date": date,
            "human_count": humans,
            "bot_count": bots,
            "total_events": total,
            "event_counts": event_counts,
            "player_stats": player_stats,
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

def build_dead_zones(df):
    """
    Divide map into 32x32 grid cells.
    Dead zones = cells never visited by any player.
    Hot zones = cells visited most frequently.
    """
    dead_zones = {}
    GRID = 32
    CELL = 1024 // GRID

    for map_id in df['map_id'].unique():
        map_id = str(map_id)
        if map_id not in MAP_CONFIG:
            continue
        map_df = df[df['map_id'] == map_id]
        pos_df = map_df[map_df['event'].isin(['Position', 'BotPosition'])]

        # Count visits per grid cell
        cell_counts = defaultdict(int)
        for _, row in pos_df.iterrows():
            try:
                px, py = world_to_pixel(float(row['x']), float(row['z']), map_id)
                cell_x = int(px // CELL)
                cell_y = int(py // CELL)
                if 0 <= cell_x < GRID and 0 <= cell_y < GRID:
                    cell_counts[(cell_x, cell_y)] += 1
            except:
                continue

        # All possible cells
        all_cells = [(x, y) for x in range(GRID) for y in range(GRID)]
        max_count = max(cell_counts.values()) if cell_counts else 1

        dead = []
        hot = []
        for cx, cy in all_cells:
            count = cell_counts.get((cx, cy), 0)
            px = cx * CELL + CELL // 2
            py = cy * CELL + CELL // 2
            if count == 0:
                dead.append([px, py])
            elif count > max_count * 0.5:
                hot.append([px, py, count])

        dead_zones[map_id] = {
            "dead": dead,
            "hot": hot,
            "grid_size": CELL,
            "total_cells": GRID * GRID,
            "visited_cells": len(cell_counts),
            "dead_cell_count": len(dead),
        }
        print(f"  {map_id}: {len(dead)} dead zones, {len(hot)} hot zones out of {GRID*GRID} cells")

    return dead_zones

def build_player_index(df):
    """Build index of all human players across all matches"""
    players = {}
    human_df = df[df['player_type'] == 'human']
    
    for uid, group in human_df.groupby('user_id'):
        matches_played = group['match_id_clean'].nunique()
        maps_played = group['map_id'].unique().tolist()
        event_counts = {str(k): int(v) for k, v in group['event'].value_counts().to_dict().items()}
        players[str(uid)] = {
            "user_id": str(uid),
            "matches_played": int(matches_played),
            "maps_played": maps_played,
            "total_events": int(len(group)),
            "event_counts": event_counts,
            "match_ids": group['match_id_clean'].unique().tolist(),
        }
    
    print(f"  Built index for {len(players)} human players")
    return players

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

    print("\nBuilding dead zones...")
    dead_zones = build_dead_zones(df)
    with open(os.path.join(OUTPUT_PATH, "deadzones.json"), "w") as f:
        json.dump(dead_zones, f)

    print("\nBuilding player index...")
    players = build_player_index(df)
    with open(os.path.join(OUTPUT_PATH, "players.json"), "w") as f:
        json.dump(players, f)

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

    print("\n✅ All done!")
    print(f"\nFiles in {OUTPUT_PATH}:")
    for f in os.listdir(OUTPUT_PATH):
        size = os.path.getsize(os.path.join(OUTPUT_PATH, f))
        print(f"  {f}: {size/1024:.1f} KB")

if __name__ == "__main__":
    main()
