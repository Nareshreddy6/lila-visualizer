import pyarrow.parquet as pq
import pandas as pd
import os

# ✅ Your exact path - adjust if needed
BASE_PATH = r"C:\Users\nares\Desktop\lila-visualizer\data\player_data"

DAY_FOLDERS = ["February_10", "February_11", "February_12", "February_13", "February_14"]

# --- Step 1: Show folder structure ---
print("=== FOLDER STRUCTURE ===")
for folder in DAY_FOLDERS:
    folder_path = os.path.join(BASE_PATH, folder)
    if os.path.exists(folder_path):
        files = os.listdir(folder_path)
        print(f"{folder}: {len(files)} files")
    else:
        print(f"{folder}: NOT FOUND")

# --- Step 2: Check minimaps ---
print("\n=== MINIMAP FILES ===")
minimap_path = os.path.join(BASE_PATH, "minimaps")
if os.path.exists(minimap_path):
    for f in os.listdir(minimap_path):
        print(f)
else:
    print("minimaps folder NOT FOUND - check path!")

# --- Step 3: Load one file from February_10 ---
print("\n=== SAMPLE FILE CONTENTS ===")
feb10_path = os.path.join(BASE_PATH, "February_10")
sample_files = os.listdir(feb10_path)
sample_file = os.path.join(feb10_path, sample_files[0])
print(f"Reading: {sample_files[0]}")

df = pq.read_table(sample_file).to_pandas()

# Decode event bytes → string
df['event'] = df['event'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)

print("\n--- Columns ---")
print(df.columns.tolist())

print("\n--- Data Types ---")
print(df.dtypes)

print("\n--- First 3 rows ---")
print(df.head(3).to_string())

print("\n--- Unique Events ---")
print(df['event'].unique())

print("\n--- Maps in this file ---")
print(df['map_id'].unique())

print("\n--- Row count ---")
print(f"Rows: {len(df)}")

# --- Step 4: Bot vs Human detection ---
print("\n=== BOT vs HUMAN DETECTION ===")
user_id = df['user_id'].iloc[0]
is_bot = user_id.strip().isdigit()
print(f"user_id: {user_id}")
print(f"Type: {'BOT' if is_bot else 'HUMAN'}")

# --- Step 5: Timestamp range ---
print("\n=== TIMESTAMP RANGE ===")
print(f"Min ts: {df['ts'].min()}")
print(f"Max ts: {df['ts'].max()}")

# --- Step 6: Load ALL days summary ---
print("\n=== FULL DATASET SUMMARY ===")
total_rows = 0
total_files = 0
maps_seen = set()
matches_seen = set()

for folder in DAY_FOLDERS:
    folder_path = os.path.join(BASE_PATH, folder)
    if not os.path.exists(folder_path):
        continue
    day_rows = 0
    for fname in os.listdir(folder_path):
        fpath = os.path.join(folder_path, fname)
        try:
            t = pq.read_table(fpath).to_pandas()
            t['event'] = t['event'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)
            day_rows += len(t)
            total_files += 1
            maps_seen.update(t['map_id'].unique())
            matches_seen.update(t['match_id'].unique())
        except Exception as e:
            print(f"  Skipped {fname}: {e}")
    total_rows += day_rows
    print(f"{folder}: {day_rows:,} rows")

print(f"\nTotal files: {total_files}")
print(f"Total rows: {total_rows:,}")
print(f"Maps found: {maps_seen}")
print(f"Unique matches: {len(matches_seen)}")