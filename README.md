# Yokogawa OpreX AHI & DBM — Industrial Process Operations Platform

A full-stack, Grafana-like industrial monitoring and analytics platform engineered to integrate with **Yokogawa CENTUM VP**, **OpreX Asset Health Insights (AHI)**, **Process Data Analytics (PDA)**, and the **OpreX Data Model Broker (DBM)**.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Industrial Plant Floor                          │
│   • Yokogawa CENTUM VP DCS (TIC-101, PIC-101, FIC-101, LIC-101)       │
│   • Yokogawa OpreX Asset Health Insights (Health Score, RUL)          │
│   • Yokogawa Process Data Analytics (Mahalanobis-Taguchi MT-Distance)  │
│   • Yokogawa OpreX Data Model Broker (CFIHOS 1.5 Ontology Validation)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              High-Throughput Ingestion & Caching Layer                 │
│   • Redis (127.0.0.1:6379)                                             │
│     - Last-Value Cache (`tag:current:{tag}`)                           │
│     - Pub/Sub Live Stream (`ydash:stream`)                             │
│   • PostgreSQL (127.0.0.1:5432/ahi_dbm)                                │
│     - ISA-95 Asset Hierarchy (Enterprise → Site → Area → Unit)        │
│     - Historical Telemetry with LTTB Downsampling Engine               │
│     - Dashboard Layouts & Panel Persistence                            │
│     - ISA-18.2 Alarm Rules & Event Log                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend Gateway (:8000)                       │
│   • WebSocket Hub (`/ws/telemetry`): 1-second push to all web clients  │
│   • Time-Series Query Engine: LTTB downsampling to ~1200 points        │
│   • Plant Telemetry Simulator: Real-time C-101 distillation physics    │
│   • REST APIs: Dashboards, ISA-95 tree, AHI Health, DBM Ontology       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Grafana-like React Web UI (:8000)                    │
│   • Draggable & Resizable Grid (`react-grid-layout`)                   │
│   • Multi-Series Trend Panels with Canvas gradient shading (ECharts)   │
│   • Industrial Circular Gauges with threshold split bands              │
│   • P&ID Mimic Diagram: Animated distillation column flows & badges    │
│   • Yokogawa MT-Anomaly Radar & Asset Health Index                     │
│   • ISA-95 Asset Tree Sidebar with live tag preview & search           │
│   • Time Range Picker & Dashboard persistence to PostgreSQL            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Services & Port Map

| Component | Host / Port | Status / Description |
| :--- | :--- | :--- |
| **Full-Stack Web App** | `http://127.0.0.1:8000/` | Serves unified React SPA + FastAPI REST & WebSocket APIs |
| **API Health Endpoint** | `http://127.0.0.1:8000/health` | Service health, Redis status, DB status, Simulator status |
| **Live WebSocket** | `ws://127.0.0.1:8000/ws/telemetry` | Real-time tag telemetry stream (1000ms cadence) |
| **PostgreSQL** | `127.0.0.1:5432/ahi_dbm` | Hypertable / Historical points, tags, dashboards |
| **Redis** | `127.0.0.1:6379` | High-frequency telemetry cache & Pub/Sub broker |

---

## 3. Project File Structure

```
c:\Users\Administrator\VM\AHI DBM\
├── backend/
│   ├── .venv/                         # Isolated Python virtual environment
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_dashboards.py   # CRUD for dashboard layouts & configs
│   │   │   ├── routes_tags.py         # ISA-95 hierarchical tree & tag list
│   │   │   ├── routes_query.py        # Time-series query with LTTB downsampler
│   │   │   ├── routes_ahi.py          # OpreX AHI & DBM ontology endpoints
│   │   │   ├── routes_alarms.py       # ISA-18.2 alarms & acknowledge API
│   │   │   └── websocket_hub.py       # Redis PubSub to WebSocket broadcaster
│   │   ├── cache/
│   │   │   └── redis_service.py       # Redis async client & Pub/Sub
│   │   ├── collector/
│   │   │   └── simulator.py           # Yokogawa plant & MT-anomaly simulator
│   │   ├── db/
│   │   │   ├── database.py            # SQLAlchemy async session
│   │   │   ├── models.py              # Schema models (Assets, Tags, Dashboards)
│   │   │   └── seed_data.py           # Initial plant hierarchy & default panels
│   │   ├── services/
│   │   │   └── downsampler.py         # LTTB downsampling algorithm
│   │   ├── config.py                  # Environment & database settings
│   │   └── main.py                    # FastAPI entry point & SPA mount
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js              # REST client
│   │   │   └── websocket.js           # Auto-reconnecting WebSocket client
│   │   ├── components/
│   │   │   ├── Navbar.jsx             # Time selector, live pill, save layout
│   │   │   ├── AssetTreeSidebar.jsx   # ISA-95 equipment hierarchy & live tags
│   │   │   ├── DashboardCanvas.jsx    # React Grid Layout engine
│   │   │   └── AddPanelModal.jsx      # Panel configuration modal
│   │   ├── panels/
│   │   │   ├── TimeSeriesPanel.jsx    # ECharts high-density trend lines
│   │   │   ├── GaugePanel.jsx         # Circular gauge with threshold zones
│   │   │   ├── SynopticPIDPanel.jsx   # Animated SVG P&ID mimic diagram
│   │   │   ├── MTAnomalyPanel.jsx     # Yokogawa MT distance radar & score
│   │   │   └── AlarmBannerPanel.jsx   # ISA-18.2 event matrix with ACK
│   │   ├── App.jsx
│   │   ├── index.css                  # Dark industrial SCADA design system
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 4. How to Run / Manage

### Running Backend:
```powershell
cd "c:\Users\Administrator\VM\AHI DBM\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Developing Frontend (Optional HMR Dev Server):
```powershell
cd "c:\Users\Administrator\VM\AHI DBM\frontend"
npm run dev
```

### Rebuilding Production Frontend:
```powershell
cd "c:\Users\Administrator\VM\AHI DBM\frontend"
npm run build
```
*(The built files in `frontend/dist` are automatically served by the FastAPI backend on port 8000).*
