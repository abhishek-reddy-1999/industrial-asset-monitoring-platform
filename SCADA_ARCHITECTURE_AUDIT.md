# SCADA_ARCHITECTURE_AUDIT.md
## Architectural Audit & Integration Blueprint: ThingsBoard-Inspired SCADA/HMI Studio for Data Insight (DI)

**Auditor / Roles**: Principal Industrial SCADA Architect, Senior React/TypeScript Developer, Senior Python FastAPI Developer, SVG Graphics Engineer, IIoT Integration Architect, Industrial HMI/UX Designer  
**Target Application**: Yokogawa Industrial Data Platform (AHI DBM)  
**Modules**: DM (Data Management), DI (Data Insight / Visualization), DA (Data Analytics)  
**Date**: October 2026  
**Status**: APPROVED & GROUNDED IN CODE REALITY  

---

## 1. Executive Summary & Verification Findings

This audit provides a factual, verified review of the existing industrial asset monitoring application and defines the architecture for embedding a native, ThingsBoard-inspired **SCADA/HMI Studio** directly into the **DI (Data Insight)** module.

### Core Architectural Principles & Ground Rules
1. **Zero Greenfield Rebuilding**: DM (Data Management), the asset hierarchy, telemetry database, alarms engine, and Function Block/Rule Chain execution engines remain intact.
2. **Native React & SVG Scene Graph**: ThingsBoard uses Angular for its frontend (`ui-ngx`); we implement a native React 19 + SVG scene graph editor and runtime. No Angular components are introduced.
3. **Direct DM Asset Attribute Binding**: Visual SCADA symbols bind directly to DM Asset Attributes (`Plant → Area → System → Asset → Attribute`) with stable attribute IDs, supporting `STATIC`, `DYNAMIC`, `RUNTIME`, `ALIAS`, `INTEGRATION`, and `ALARM` bindings.
4. **Authoritative Quality & Stale Handling**: SCADA visualization reflects authoritative data qualities (`GOOD`, `BAD`, `UNCERTAIN`, `STALE`, `MISSING`) governed by `UnifiedValueEnvelope`. Stale or missing telemetry is visibly marked rather than masked by stale values or fake zeros.
5. **Declarative SVG Symbol Engine**: SVG symbols are registered with declarative JSON behaviors and verified tags. Arbitrary executable scripts inside SVGs are strictly forbidden and sanitized on ingestion.

---

## 2. Existing Application Inspection

### 2.1 Frontend Stack & Dependencies
*Source: `frontend/package.json`*
- **React**: `19.2.8` (React 19 Concurrent Mode, Hooks, Memoization)
- **Styling**: Tailwind CSS `v4.3.3` with `@tailwindcss/vite`
- **Component & Icon Library**: `lucide-react` (`^1.52.0`)
- **Visual Analytics**: Apache ECharts (`^6.1.0`)
- **Dashboard Grid**: `react-grid-layout` (`^2.2.4`)
- **Build Tool**: Vite `8.3.0` with `@vitejs/plugin-react` (`^6.1.1`)
- **Linter**: `oxlint` (`^1.81.0`)

### 2.2 Navigation & DI Subviews
*Source: `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`*
- **Primary Module Switch**: Managed via `currentModule` (`'DI'` vs `'DM'`).
- **DI Subviews**: Managed via `diSubView` state:
  - `'dashboards'`: Operational Dashboard Canvas (`<DashboardCanvas />`) with 25+ customizable panels.
  - `'assets'`: Operational Asset Digital Twin & Mimic Console (`<MasterAssetDashboard />`).
  - `'scada'`: Currently renders a monolithic legacy prototype (`<FuxaScadaWidget />`).
- **SCADA Studio Placement**: The `'scada'` subview is the designated integration point. It will host the full **SCADA Studio** suite:
  1. *SCADA Screen List*
  2. *SCADA Screen Designer* (Pan/Zoom Canvas, Palette, Properties, Inspector)
  3. *SCADA Runtime Viewer* (Live process mimicing, interactive popups)
  4. *SCADA Symbol Library* (Registry of pumps, motors, valves, tanks, pipes, instruments)
  5. *SCADA Symbol Editor* (SVG inspection, tag mapping, declarative behaviors)
  6. *SCADA Screen Templates*
  7. *SCADA Versions & Publish History*

### 2.3 State Management & Telemetry Streaming
*Source: `frontend/src/api/websocket.js`, `frontend/src/views/dm/dmContext.jsx`*
- **Context API**: `DMContext` provides global access to `assets`, `devices`, `brokers`, `ruleChains`, `functionBlocks`, and `mappableDmTags`.
- **WebSocket Streaming**: `telemetryWS` connects to `ws://<host>:91/ws/telemetry`.
  - Batching: `requestAnimationFrame` with a 250ms debounce window.
  - Heartbeat: 15-second ping interval (`{"action": "ping"}`).
  - Auto-reconnect: 3-second backoff upon disconnection.
  - Deduplication: Single multiplexed WebSocket connection shared across all frontend subscribers.

### 2.4 Existing UI Components Reusable in SCADA
1. **Asset Attribute Tree**: `<AssetAttributeBrowser />` (`frontend/src/components/AssetAttributeBrowser.jsx`)
   - 5-level hierarchy (`Plant → Area → System → Asset → Attribute`).
   - Supports search, favorites, category filters (`Dynamic`, `Static`, `Runtime`, `Alias`, `Integration`), and data type filters (`Double`, `Int`, `Boolean`, `String`).
2. **Trend Chart Popups**: `<TimeSeriesPanel />` (`frontend/src/panels/TimeSeriesPanel.jsx`)
   - Interactive ECharts time-series with area fills, downsampling, and time range toggles (`now-15m`, `now-1h`, `now-24h`).
3. **Alarm Visualization**: `<AlarmsTablePanel />` and `<AlarmBannerPanel />`
   - Real-time alarm severities (`INFO`, `WARNING`, `CRITICAL`, `EMERGENCY`), active states, and acknowledgment triggers.
4. **Gauges & Status Badges**: `<GaugePanel />` and `<SingleStatPanel />` for embedding into SCADA process windows.

---

## 3. Backend Architecture Inspection

### 3.1 FastAPI Server & Routers
*Source: `backend/app/main.py`, `backend/app/config.py`*
- **FastAPI**: `0.115.6`, running on port `91` with ASGI Socket.IO wrapper.
- **Active Routers**:
  - `/api/v1/dashboards`: CRUD for dashboards and layouts (`routes_dashboards.py`).
  - `/api/v1/tags`: Tag metadata, ISA-95 tree, snapshots, and telemetry ingestion (`routes_tags.py`).
  - `/api/v1/query`: Time-series queries with LTTB downsampling (`routes_query.py`).
  - `/api/v1/alarms`: Alarm event queries and acknowledgment (`routes_alarms.py`).
  - `/api/v1/ahi`: Asset Health Index & MT Multivariate Anomaly (`routes_ahi.py`).
  - `/api/v1/dm`: Data Management APIs (assets, devices, function blocks, rule chains) (`routes_dm.py`).
  - `/ws/telemetry`: Real-time WebSocket telemetry dispatcher (`websocket_hub.py`).

### 3.2 SQL Models & Storage Layers
*Source: `backend/app/db/models.py`, `backend/app/db/database.py`, `backend/app/api/dm_service.py`*
- **PostgreSQL Database** (`ahi_dbm` on port 5432):
  - `asset_nodes`: ISA-95 nodes (`ENTERPRISE`, `SITE`, `AREA`, `UNIT`, `EQUIPMENT`).
  - `tags`: DCS/Device tags, engineering units, min/max limits, scan rates.
  - `historical_points`: Downsampled and raw telemetry time-series points.
  - `dashboards`: JSON serialized dashboard configurations.
  - `alarm_rules` & `alarm_events`: ISA-18.2 compliant alarms and state tracking.
  - `dm_function_block_templates` & `dm_function_block_executions`.
- **In-Memory & Persisted DM Store (`dm_store`)**:
  - Persisted in `dm_store_state.json`.
  - Maintains `assets`, `asset_templates`, `devices`, `device_templates`, `brokers`, `rule_chains`, `function_blocks`, `uom_list`, and legacy `scada_windows`.
- **Redis Cache & Pub/Sub** (port 6379):
  - `tag:current:<tag_name>`: Latest cached JSON snapshots.
  - `active_tags`: Set of all active tags.
  - `ydash:stream`: Real-time Pub/Sub channel feeding WebSocket and Socket.IO clients.

### 3.3 Unified Value Envelope & Quality System
*Source: `backend/app/services/value_envelope.py`*
- **States**: `GOOD`, `BAD`, `UNCERTAIN`, `STALE`, `MISSING`.
- **Attribute Types**: `STATIC`, `DYNAMIC`, `RUNTIME`, `ALIAS`, `INTEGRATION`, `COMMAND`.
- **Freshness Engine**: Automatically marks values `STALE` if older than 3x the scan rate or 30 seconds.

---

## 4. Integration Points for the SCADA Studio

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DATA INSIGHT (DI) SCADA STUDIO                     │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────┐ │
│  │   SCADA Designer      │  │  SCADA Runtime Viewer │  │Symbol Editor│ │
│  │ (Pan/Zoom Canvas,     │  │ (Live Process Mimic,  │  │(SVG Parser, │ │
│  │  Pipes, Snap, Rulers) │  │  State Animation)     │  │ Tag Mapper) │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────┬──────┘ │
└──────────────┼──────────────────────────┼─────────────────────┼────────┘
               │                          │                     │
               ▼                          ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND DATA & STATE BUS                       │
│  - AssetAttributeBrowser (Plant → Area → System → Asset → Attribute)   │
│  - SCADA Subscription Manager (Deduplicated WebSocket multiplexer)    │
│  - Visual Behavior Evaluator (Pure functional state transitions)       │
│  - Trend & Alarm Popups (Direct reuse of DI TimeSeries & Alarm panels) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP /api/v2/di/scada/*
                                    │ WS   /ws/di/scada/live
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND ENGINE                         │
│  - routes_scada.py: Screen CRUD, Versioning, Publish, Symbol Registry  │
│  - scada_service.py: Declarative state engine, SVG Sanitizer           │
│  - value_envelope.py: Telemetry quality (GOOD/BAD/UNCERTAIN/STALE)     │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│  DATA MANAGEMENT (DM) STORE  │  │        REDIS & TIMESERIES DB         │
│  - Plant Assets & Attributes │  │  - Redis PubSub (ydash:stream)       │
│  - Function Block Results    │  │  - PostgreSQL historical_points      │
│  - Active Alarm States       │  │  - Authoritative Latest Snapshots    │
└──────────────────────────────┘  └──────────────────────────────────────┘
```

1. **Asset Attribute Resolution**:
   - The Studio inspects `dm_store.assets`. Each asset contains rich attributes with stable IDs (e.g., `attr-cdu-1`, `attr-pmp-1`, `attr-pmp-5`).
   - The Studio binds to `attribute_id` and tracks its underlying `tag_name`, engineering units (`uom`), min/max ranges, and data quality.
2. **Telemetry Subscriptions**:
   - On opening a SCADA screen, the frontend gathers all required attribute IDs and tag names into a deduplicated subscription request.
   - Initial snapshot is retrieved via `/api/v2/di/scada/values/snapshot`.
   - Real-time updates flow over `/ws/di/scada/live` (or the existing `/ws/telemetry` bridge).
3. **Trend & Alarm Popups**:
   - Clicking an instrument or process value opens an in-place trend modal leveraging `<TimeSeriesPanel />` bound to the selected attribute's tag name and historical telemetry.
   - Alarm state overlays bind to active alarms in `routes_alarms.py` and DM alarm rules.

---

## 5. Proposed Data Schema for SCADA Persistence & Versioning

To ensure zero interference with existing tables, SCADA persistence uses dedicated entities and versioned JSONB schemas:

### 5.1 Conceptual Entities
1. `scada_screens`:
   - `id`: String UUID (e.g., `screen-water-transfer-01`)
   - `name`: Display name (e.g., "Potable & Demin Water Transfer Loop")
   - `description`: Text summary
   - `site_id`: Project / Site identifier
   - `default_asset_id`: Optional root asset context
   - `width`: Design canvas width in pixels (e.g., `1920`)
   - `height`: Design canvas height in pixels (e.g., `1080`)
   - `background`: Canvas background settings (color, gradient, grid visible)
   - `status`: `'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED'`
   - `active_version`: Current published version string (e.g., `"1.0.0"`)
   - `layout`: JSON representation of nodes, connectors, and canvas configuration
   - `created_at` & `updated_at`: ISO timestamps
2. `scada_screen_versions`:
   - `id`: Version snapshot ID
   - `screen_id`: Foreign key to `scada_screens`
   - `version`: Semantic version (e.g., `"1.0.0"`, `"1.0.1"`)
   - `layout_snapshot`: Immutable JSON snapshot of the screen layout
   - `published_by`: User email / ID
   - `changelog`: Summary of edits
   - `published_at`: ISO timestamp
3. `scada_symbols`:
   - `id`: Symbol identifier (e.g., `sym-pump-centrifugal`, `sym-tank-vertical`)
   - `name`: Display name
   - `category`: Category (`Pumps`, `Motors`, `Valves`, `Tanks`, `Pipes`, `Instruments`, `HMI Controls`, `Electrical`, `Process Equipment`)
   - `description`: Text
   - `version`: Semantic version (e.g., `"1.0.0"`)
   - `svg_content`: Sanitized SVG string
   - `default_width`: Integer
   - `default_height`: Integer
   - `tags`: List of exposed SVG element IDs and symbolic names (e.g., `["pump_casing", "rotor_blades", "status_indicator"]`)
   - `properties`: Configurable visual properties (fill colors, stroke width, label positions)
   - `behaviors`: Supported declarative behavior definitions (rotation, fill, color change, blinking)
   - `actions`: Supported user interactions (`OPEN_TREND`, `OPEN_ASSET`, `NAVIGATE_SCREEN`, `ALARM_POPUP`)
   - `is_builtin`: Boolean (`true` for library items, `false` for user-uploaded)

---

## 6. Proposed API Surface (`routes_scada.py`)

All endpoints are mounted under `/api/v2/di/scada`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v2/di/scada/screens` | List all SCADA screens (with status, version, metadata) |
| `POST` | `/api/v2/di/scada/screens` | Create a new SCADA screen definition |
| `GET` | `/api/v2/di/scada/screens/{id}` | Get full screen definition (draft layout) |
| `PUT` | `/api/v2/di/scada/screens/{id}` | Save draft screen layout and settings |
| `DELETE`| `/api/v2/di/scada/screens/{id}` | Delete a SCADA screen |
| `POST` | `/api/v2/di/scada/screens/{id}/validate` | Validate bindings, asset existence, and syntax |
| `POST` | `/api/v2/di/scada/screens/{id}/publish` | Create immutable published version snapshot |
| `GET` | `/api/v2/di/scada/screens/{id}/versions` | List version history for a screen |
| `POST` | `/api/v2/di/scada/screens/{id}/rollback` | Rollback active version to a prior snapshot |
| `GET` | `/api/v2/di/scada/screens/{id}/runtime` | Fetch authoritative published layout for runtime |
| `GET` | `/api/v2/di/scada/symbols` | List registered SVG symbols by category |
| `POST` | `/api/v2/di/scada/symbols` | Register / upload a custom sanitized SVG symbol |
| `GET` | `/api/v2/di/scada/symbols/{id}` | Get symbol definition and raw SVG |
| `PUT` | `/api/v2/di/scada/symbols/{id}` | Update symbol behaviors, tags, or metadata |
| `POST` | `/api/v2/di/scada/values/snapshot` | Fetch bulk attribute latest value snapshot |
| `WS` | `/ws/di/scada/live` | Multiplexed WebSocket stream with subscription filter |

---

## 7. Frontend SCADA Studio Component Architecture

Located in `frontend/src/views/di/scada/`:

1. `<ScadaStudio />`: Top-level orchestrator with tab/view switcher:
   - Screens (`ScadaScreenList`)
   - Designer (`ScadaDesigner`)
   - Runtime Viewer (`ScadaRuntimeViewer`)
   - Symbol Library (`ScadaSymbolLibrary`)
   - Symbol Editor (`ScadaSymbolEditor`)
   - Screen Templates (`ScadaScreenTemplates`)
   - Versions & Audit (`ScadaVersionHistory`)
2. `<ScadaDesigner />`: 4-Panel CAD/HMI visual editor:
   - **Left Panel**: Symbol library palette (categorized, searchable), Layers list (reorder, lock, hide), Asset Browser tree selector.
   - **Center Panel**: Infinite pan/zoom canvas, fixed industrial viewBox coordinates, rulers, grid snapping, drag-and-drop, smart orthogonal/Bezier pipe connector drawing, multi-select, resize/rotation handles.
   - **Right Panel**: Properties inspector (Dimensions, Stroke, Fill), Data Binding inspector (Asset Attribute Browser), Behavior/Animation rules, Interaction actions.
   - **Top Toolbar**: New, Open, Save, Undo/Redo, Align/Distribute, Zoom Fit, Validate, Preview, Publish, Version History.
   - **Bottom Panel**: Live Tag Inspector, Binding Errors, Subscription Status, Diagnostics.
3. `<ScadaRuntimeViewer />`: High-efficiency SVG process graphics runtime:
   - Proportional responsive scaling (`Contain`, `Fit Width`, `Fixed SCADA`, `Full Screen`).
   - SVG CSS / RAF animations (motor rotation, pipe flow dashoffset, tank liquid fill clipPath).
   - In-place trend chart popups (via `TimeSeriesPanel`).
   - Alarm badges and active flashing indicators.
   - Navigation links between Plant Overview $\rightarrow$ System $\rightarrow$ Equipment Detail.
4. `<ScadaSymbolEditor />`: ThingsBoard-inspired symbol dev tool:
   - Upload raw SVG.
   - SVG DOM node inspector: highlights paths, rects, text, groups.
   - Tag mapping: assign symbolic tags (`pump_body`, `rotor`, `flow_path`, `level_fill`).
   - Declarative behaviors: map tags to properties (color change on state, rotation on running).
   - Live preview sandbox with demo attribute sliders.
5. `<ScadaSymbolLibrary />`: Visual catalog of industrial SVG symbols across all 9 standard categories.

---

## 8. SVG Security & Sanitization Specification

To guarantee safety against Cross-Site Scripting (XSS) and malicious code execution:
1. **Forbidden Elements**:
   - `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, `<link>`.
   - Any SVG element with event handler attributes (`onload`, `onclick`, `onerror`, `onmouseover`, etc.).
2. **Sanitization Filter**:
   - Backend Python `svg_sanitizer` parses incoming SVG XML using standard `xml.etree.ElementTree`.
   - Strips dangerous tags, removes external `href` references, removes script attributes.
   - Ensures strictly valid SVG markup before storing in the symbol registry.
3. **Client Execution**:
   - React renders symbols purely as SVG DOM structures or clean SVG masks. No `eval()`, `new Function()`, or untrusted script execution.

---

## 9. Phased Implementation Strategy

| Phase | Title | Scope & Deliverable |
|---|---|---|
| **Phase 1** | Audit & Architecture | Document existing system, dependencies, and integration blueprint (`SCADA_ARCHITECTURE_AUDIT.md`). |
| **Phase 2** | DI Module Navigation | Add SCADA subsection to DI navigation (`Navbar.jsx`, `App.jsx`, `ScadaStudio.jsx`). |
| **Phase 3** | Canvas & Designer Engine | Visual pan/zoom SVG canvas, grid, rulers, snapping, selection, connectors, undo/redo, 4-panel layout. |
| **Phase 4** | SVG Symbol Registry | Comprehensive library of industrial symbols (Pumps, Motors, Valves, Tanks, Pipes, Instruments, HMI Controls, Electrical). |
| **Phase 5** | SVG Symbol Editor | Upload, inspect SVG nodes, assign tags, define declarative behaviors, test sandbox. |
| **Phase 6** | Asset Attribute Binding | Integration with 5-level asset tree, binding modes (`STATIC`, `DYNAMIC`, `RUNTIME`, `ALIAS`, `INTEGRATION`), quality handling. |
| **Phase 7** | Dynamic Visual Behaviors | State-based colors, tank level clipPaths, animated pipe flows, rotation, blinking, safe expressions. |
| **Phase 8** | Interactive Operations | Click actions: trend popups, equipment popups, multi-level plant navigation, future control guardrails. |
| **Phase 9** | DI Trends & Alarms | Direct reuse of DI `TimeSeriesPanel` and alarm services for in-place inspection. |
| **Phase 10** | Persistence & Versions | Draft/Publish workflow, immutable snapshots, version rollback, JSONB persistence. |
| **Phase 11** | FastAPI Backend | Dedicated router `/api/v2/di/scada/*`, snapshot APIs, and WebSocket telemetry gateway. |
| **Phase 12** | React SCADA Components | Modular implementation in `frontend/src/views/di/scada/`. |
| **Phase 13** | Required Demonstrations | Build and verify Demo A (Water Transfer System), Demo B, Demo C, Demo D, Demo E. |
| **Phase 14** | Automated Testing | Comprehensive backend test suite and frontend build validation. |
| **Phase 15** | Delivery & Acceptance | Final acceptance report and operational documentation. |

---

## 10. Risk Analysis & Mitigation Matrix

| Risk | Severity | Mitigation Strategy |
|---|---|---|
| **SVG XSS / Code Injection** | High | Strict server-side XML sanitization rejecting `<script>`, `<foreignObject>`, and `on*` attributes. Strictly declarative JSON state engine. |
| **Browser Performance on 100+ Live Symbols** | High | Shared single WebSocket connection, RAF batching (250ms), CSS transform-based hardware-accelerated animations, pausing hidden screens. |
| **Disconnection & Stale Telemetry** | Medium | Heartbeat watchdog; auto-mark stale data when stream disconnects; authoritative resynchronization snapshot on reconnect. |
| **Accidental Overwrite of Active SCADA Screens** | High | Strict Draft vs Published version separation. Editing only updates drafts; runtime loads immutable published versions. |
| **Incompatible Connector Positioning on Resize** | Medium | Fixed design coordinate space (`1920x1080`) with proportional SVG `viewBox` scaling. Equipment and pipes never drift relative to each other. |

---

## 11. Conclusion

The application has all necessary primitives: robust DM assets and attributes, unified value envelopes, real-time WebSockets, time-series downsampling, and an active React 19 frontend. The proposed architecture natively integrates a ThingsBoard-quality SCADA Studio into Data Insight without modifying unrelated modules or disrupting existing workflows. Proceeding to Phase 2.
