import pyarrow.parquet as pq
import pandas as pd
import os

BASE_PATH = r"C:\Users\nares\Desktop\lila-visualizer\data\player_data"

# Load ALL files from one day and find a match with many events
folder = os.path.join(BASE_PATH, "February_10")
files = os.listdir(folder)

# Group files by match_id
match_files = {}
for fname in files:
    parts = fname.split('_')
    if len(parts) >= 2:
        match_id = '_'.join(parts[1:])
        if match_id not in match_files:
            match_files[match_id] = []
        match_files[match_id].append(fname)

# Find match with most files (most players)
match_files_sorted = sorted(match_files.items(), key=lambda x: len(x[1]), reverse=True)
print("Top 5 matches by player count:")
for mid, flist in match_files_sorted[:5]:
    print(f"  {mid[:40]} -> {len(flist)} players")

# Load all files for the top match
top_match_id, top_files = match_files_sorted[0]
print(f"\nLoading top match: {top_match_id[:40]}")
dfs = []
for fname in top_files:
    fpath = os.path.join(folder, fname)
    try:
        df = pq.read_table(fpath).to_pandas()
        df['event'] = df['event'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else str(x))
        dfs.append(df)
    except:
        pass

combined = pd.concat(dfs, ignore_index=True)
print(f"Total rows: {len(combined)}")
print(f"Event types: {combined['event'].value_counts().to_dict()}")
print(f"\nRaw ts dtype: {combined['ts'].dtype}")
print(f"Raw ts sample: {combined['ts'].head(5).tolist()}")
print(f"Raw ts min: {combined['ts'].min()}")
print(f"Raw ts max: {combined['ts'].max()}")
print(f"Raw ts range (max-min): {combined['ts'].max() - combined['ts'].min()}")
print(f"\nIn seconds: {(combined['ts'].max() - combined['ts'].min()).total_seconds() if hasattr(combined['ts'].max() - combined['ts'].min(), 'total_seconds') else 'N/A'}")

# Show sorted ts for one player
player = combined['user_id'].iloc[0]
player_df = combined[combined['user_id'] == player].sort_values('ts')
print(f"\nPlayer {player} ts values (first 5):")
print(player_df['ts'].head(5).tolist())
print(f"Player event count: {len(player_df)}")
