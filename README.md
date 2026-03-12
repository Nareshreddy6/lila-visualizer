# LILA BLACK — Player Journey Visualization Tool

A web-based analytics tool for Level Designers to explore player behavior across maps in **LILA BLACK**, an extraction shooter game. Built as part of a technical assignment for LILA Games.

🔗 **Live Tool:** https://lila-visualizer-weld.vercel.app/
📁 **GitHub:** https://github.com/Nareshreddy6/lila-visualizer

## 🎮 Test It Immediately
1. Open the live tool
2. Select **Ambrose Valley** from the map dropdown
3. Find match **`fbbc5d02-dd79-42`** in the match list
4. Click it — you'll see both **Human and Bot** paths on the map
5. Press **▶ Play** to watch the match unfold

## 📸 What It Does
| Feature | Description |
|---|---|
| 🗺 Player Journeys | Human & bot movement paths on the minimap |
| 💀 Kill Heatmap | Where kills are concentrated across all matches |
| ☠️ Death Heatmap | Where players die most frequently |
| 🔥 Traffic Heatmap | Most visited areas of the map |
| 📦 Loot Heatmap | Where players pick up items |
| ⬛ Dead Zone Detector | Highlights areas players never visit — key insight for Level Designers |
| 📊 Match Stats Panel | Per-match kill/death/loot breakdown with per-player table |
| 🎨 Per-Player Colors | Each player gets a unique color for easy path tracking |
| 👁 Player Focus Mode | Click any path to isolate one player |
| ⚖️ Compare Mode | Two matches side-by-side on the same map |
| ✏️ Zone Annotations | Drop labeled markers on the map |
| 👤 Players Tab | Browse all 339 human players across 5 days |
| 🔍 Event Filter | Show only kills, loot, storm deaths etc. |
| ▶ Timeline Playback | Watch a match unfold event by event |

## 🗂 Project Structure
<img width="768" height="658" alt="image" src="https://github.com/user-attachments/assets/f61c458b-88c0-4530-90c9-db84ae0b7089" />

## 🚀 Run Locally
### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Install Python dependencies
```bash
pip install pandas pyarrow
```

### 2. Run the data pipeline
```bash
python build_data.py
```
This reads all parquet files and outputs JSON to `frontend/public/`

### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173
---

## 🔧 Data Pipeline

The `build_data.py` script processes **1,243 parquet files** (89,104 rows) across 5 days:

1. **Load** all files from daily folders
2. **Decode** binary event column to string
3. **Detect** humans (UUID user_id) vs bots (numeric user_id)
4. **Convert** world coordinates (x, z) → minimap pixels using per-map config
5. **Build** synthetic timeline (0–1000) per match using row order
6. **Generate** dead zone grid (32×32 cells) per map
7. **Index** all 339 human players with match history
8. **Output** split by map for smaller frontend payloads

### Coordinate Mapping
```python
u = (x - origin_x) / scale
v = (z - origin_z) / scale
pixel_x = u * 1024
pixel_y = (1 - v) * 1024  # Y flipped — image origin is top-left
```

### Map Config
| Map | Scale | Origin X | Origin Z |
|---|---|---|---|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |
---

## 🏗 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Data pipeline | Python + PyArrow + Pandas | Native parquet support, fast transforms |
| Frontend | React + Vite | Fast dev, clean component model |
| Rendering | HTML5 Canvas | Handles 60k+ events with zero lag |
| Hosting | Vercel | Zero-config deploy, free CDN |
| Data format | Static JSON | No backend needed |

---

## 📊 Dataset

| Metric | Value |
|---|---|
| Date Range | Feb 10–14, 2026 |
| Total Files | 1,243 |
| Total Events | 89,104 |
| Unique Players | 339 humans |
| Unique Matches | 796 |
| Maps | AmbroseValley, GrandRift, Lockdown |

### Event Types
| Event | Description |
|---|---|
| `Position` | Human player movement |
| `BotPosition` | Bot movement |
| `Kill` / `Killed` | PvP combat |
| `BotKill` / `BotKilled` | Human vs bot combat |
| `KilledByStorm` | Storm death |
| `Loot` | Item pickup |

## ⚠️ Known Limitations

- **Timestamp** — Raw `ts` column spans only ~0.7s per match (server logging artifact). Timeline uses row order (0–100%) instead of real match duration.
- **Data not committed** — Raw parquet files are excluded from the repo due to size. Run `build_data.py` with your own data copy.

## 👤 Author

Built by **Nareshreddy** for the LILA Games Level Design Analytics
