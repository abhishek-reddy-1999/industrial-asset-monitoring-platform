# ARCHITECTURE AUDIT: INDUSTRIAL FUNCTION BLOCK STUDIO V2 & VISUAL RULE CHAIN ENGINE
**Yokogawa OpreX AHI & Data Management Platform Integration**
**Date:** October 2026  
**Auditor:** Principal Industrial IIoT Architect, Full-Stack Systems Engineer & Database Architect  
**Target Reference:** ThingsBoard PE Rule Engine & Yokogawa AHI DBM Operational Specifications

---

## 1. Executive Summary

This architecture audit evaluates the existing codebase of the **Yokogawa OpreX AHI & Data Management (DBM)** application to establish an implementation roadmap for two enterprise-grade modules:
1. **Asset Function Block Studio V2**: A tag-centric, synchronous/cyclical and event-triggered mathematical calculation workflow engine (IEC 61131-3 / DCS function block model) running on plant asset attributes.
2. **Visual Rule Chain Engine**: A message-centric, event-driven ThingsBoard-parity IoT pipeline engine processing inbound telemetry, attribute changes, alarms, and RPC commands through configurable DAG pipelines.

The audit inspects frontend architecture, backend routing, database schemas, Redis Pub/Sub, ingestion mechanisms, and external integration forwarders to guarantee zero regressions, preserve existing asset and alarm data, and eliminate placeholder code.

---

## 2. Existing Repository Audit & Inventory

### 2.1 Frontend Architecture
- **Framework & Runtime**: React 19 (`react: ^19.2.8`, `react-dom: ^19.2.8`), Vite 8 (`vite: ^8.3.0`), Tailwind CSS v4 (`@tailwindcss/vite: ^4.3.3`).
- **Styling & Layout**: Vanilla CSS design system (`index.css` with 44KB of industrial dark-theme variables: `#0b1120`, `#020617`, `#090d16`), Tailwind CSS utility classes, `react-grid-layout` for dashboard panels.
- **Icons & Graphics**: `lucide-react: ^1.52.0`, Apache ECharts (`echarts: ^6.1.0`) with WebGL canvas rendering.
- **State Management & Routing**:
  - Top-level application mode switcher in [`frontend/src/App.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/App.jsx): Data Insight (`DI`) vs Data Management (`DM`).
  - Context Provider in [`frontend/src/views/dm/dmContext.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/dm/dmContext.jsx): Stores assets, asset templates, devices, device templates, brokers, alarms, alarm rules, function blocks, function block templates, rule chains, and dashboard widgets.
  - Multi-entity workspace navigation in [`frontend/src/views/dm/DMApp.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/dm/DMApp.jsx): Navigates across 18 distinct views including `asset`, `device`, `broker`, `alarm`, `function_block`, and `rule_chain`.
- **Existing Editors**:
  - [`FunctionBlockEntityView.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/dm/FunctionBlockEntityView.jsx): Configured blocks table, wire pin tab, V8 sandbox tester, template catalog modal.
  - [`RuleChainView.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/dm/RuleChainView.jsx): SVG-based visual canvas, node palette with 5 categories (`FILTER`, `ENRICHMENT`, `TRANSFORM`, `ACTION`, `EXTERNAL`), ThingsBoard JSON export/import, step-by-step test run simulator.

### 2.2 Backend Architecture (FastAPI & Python Runtime)
- **Framework**: FastAPI (Python 3.12+ in `.venv`), ASGI gateway with python-socketio (`socketio.ASGIApp` wrapping FastAPI).
- **Entry Point**: [`backend/app/main.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/main.py):
  - Lifespan manager orchestrating Redis client connection, database seeding, background plant simulator, OPC UA manager, Function Block background scheduler (`fb_scheduler`), and IoT device scan watchdog.
  - CORS middleware configured for industrial ports (`90`, `91`, `5173`, `5174`).
  - Static file mount serving frontend production build from `frontend/dist`.
- **API Routers**:
  - `routes_dm.py`: 3,294 lines implementing CRUD and test execution for assets, attributes, templates, devices, brokers, converters, alarms, rule chains (`/api/v1/dm/rule-chains`), and function blocks (`/api/v1/dm/function-blocks`).
  - `routes_dashboards.py`, `routes_tags.py`, `routes_query.py`, `routes_ahi.py`, `routes_alarms.py`, `routes_opcua.py`.
  - `websocket_hub.py` & `socketio_hub.py`: Real-time streaming to frontend clients.
- **Service Layer**:
  - [`fb_engine.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/services/fb_engine.py): Executes JavaScript blocks via Node.js V8 harness (`execute_js_block`), fetches live inputs from Redis or DB, and writes target calculated values to Redis and `HistoricalPoint`.
  - [`dm_service.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/api/dm_service.py): In-memory and file-persisted (`dm_store_state.json`) Data Store (`DMDataStore`). Handles asset attribute recalculations, device metric bindings, and rule chain test-runs.
  - [`event_forwarder.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/services/event_forwarder.py) & [`alarm_forwarder.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/services/alarm_forwarder.py): Dispatches alarms and asset telemetry to external webhooks, Node-RED, Azure Event Hubs, and RabbitMQ.

### 2.3 Database Models & Persistence Schema
SQLAlchemy 2.0 async models defined in [`backend/app/db/models.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/db/models.py):
- `AssetNode`: ISA-95 plant hierarchy (`id`, `parent_id`, `name`, `level` [ENTERPRISE, SITE, AREA, UNIT, EQUIPMENT], `path`, `description`).
- `Tag`: Plant measurement tag register (`id`, `asset_id`, `tag_name`, `display_name`, `eng_units`, `data_type`, `min_range`, `max_range`, `source_type`, `scan_rate_ms`, `is_active`).
- `HistoricalPoint`: Timeseries historian (`id`, `tag_name`, `timestamp`, `value`, `quality` [GOOD, BAD, UNCERTAIN], composite index on `tag_name, timestamp`).
- `FunctionBlockTemplate`: Formula definitions (`id`, `template_code`, `name`, `category`, `inputs_schema`, `outputs_schema`, `formula_code`, `version`).
- `FunctionBlockExecution`: Active instance (`id`, `execution_name`, `template_id`, `asset_id`, `target_tag`, `schedule_interval`, `status`, `last_run_at`, `last_execution_ms`, `last_output_value`, `input_bindings`, `execution_log`).
- `Device`, `BrokerConfig`, `AlarmRule`, `AlarmEvent`, `AHIAssetHealth`, `ActivityLog`.
- `dm_store_state.json`: High-speed JSON snapshot file storing full state of assets, attribute metadata, device templates, and visual rule chain graphs.

### 2.4 Caching & Messaging Layer
- **Redis (`redis:7.2-alpine`, port 6379)**:
  - Key-value live tag cache: `ydash:tag:<tag_name>` stores `{ tag_name, timestamp, value, quality, eng_units }`.
  - Pub/Sub channel `ydash:stream` broadcasts live JSON frames to WebSocket clients.
  - Multi-protocol ingestion: Supports MQTT (`1883`), Modbus TCP (`502`), OPC-UA (`4840`), and HTTP REST (`91`).

---

## 3. Gap Analysis: Current State vs. Target Requirements

| Architectural Area | Existing Capability | Target Spec Requirement | Gap & Action Required |
| :--- | :--- | :--- | :--- |
| **Asset Attribute Model** | Attributes stored as arrays inside asset JSON (`Dynamic`, `Static`, `Runtime`, `Alias`, `Integration`, `Command`). | Unified Value Envelope: `asset_id`, `attribute_id`, `name`, `value`, `data_type`, `unit`, `quality` (`GOOD`, `BAD`, `UNCERTAIN`, `STALE`, `MISSING`), `source_timestamp`, `ingestion_timestamp`. | Create formal value envelope schema in Python & TS; enrich attribute engine with STALE/MISSING quality detection. |
| **Attribute Browser** | Basic dropdown selector by asset. | 5-level hierarchical browser: `Plant → Area → System → Asset → Attribute` with tag search, type filters, UoM display, live quality indicator, favorites, and persistent ID binding. | Develop universal `AssetAttributeBrowser` component for both visual studios. |
| **Function Block Canvas** | Table list + basic wire connector. | 4-panel visual Studio: Left (Library & Attribute Browser), Center (Drag-and-drop canvas, curves, zoom/pan/grid, minimap), Right (Settings, I/O bindings, units), Bottom (Execution console, live I/O, traces, simulation). | Implement complete `FunctionBlockStudioV2` editor with comprehensive node categories. |
| **Function Block Library** | 7 pre-seeded templates (Delta T, MT Anomaly, Pump Head, PID, Totalizer, OEE, Efficiency). | 7 categories (Asset Input, Math, Logic, Statistics, Time & Signal, Industrial Calc, Output) containing 60+ standardized reusable blocks. | Implement backend block registry with JSON schemas and dual execution support (Python safe-AST + Node.js sandbox). |
| **Function Block Execution Engine** | Node.js subprocess running single-block scripts. | Python-native execution engine supporting DAG compilation, cycle detection, input freshness tolerance, event alignment, stateful block persistence, and historical replay simulation. | Implement `fb_studio_engine.py` with graph compiler, topological sort, and historical replay. |
| **Rule Chain Designer** | SVG canvas with 5 categories and basic test run simulation. | ThingsBoard PE parity: 7 node categories (Filter, Enrichment, Transform, Action, External, Flow Control, Analytics), colored multi-relation branches (`True`, `False`, `Success`, `Failure`), nested chains, and debug traces. | Enhance `RuleChainStudioV2` with full 7-category palette and multi-branch visual connectors. |
| **Rule Chain Execution Engine** | Linear simulation loop with simulated latency. | Full message-driven execution engine supporting ThingsBoard message envelope (`id`, `type`, `originator`, `data`, `metadata`, `context`), relation routing, nested rule chains, and idempotency protection. | Implement `rule_engine.py` service with isolated script execution and comprehensive node handlers. |

---

## 4. Architectural Design & Component Architecture

### 4.1 Unified Value Envelope Schema
```json
{
  "asset_id": "ast-eq-pump",
  "attribute_id": "attr-pmp-1",
  "name": "Discharge Pressure",
  "value": 582.4,
  "data_type": "float",
  "unit": "kPa",
  "quality": "GOOD",
  "source_timestamp": "2026-10-11T10:00:00.000Z",
  "ingestion_timestamp": "2026-10-11T10:00:00.042Z"
}
```
Supported Data Qualities:
- `GOOD`: Live sensor reading within physical range and refreshed within scan rate tolerance.
- `BAD`: Sensor out of range, transmitter fault, wire break, or parse error.
- `UNCERTAIN`: Reading clamped, calibration mode, or upstream communication degradation.
- `STALE`: No update received within `max_staleness_ms` (e.g. > 3 × scan rate).
- `MISSING`: Target tag or attribute unconfigured or never published.

### 4.2 Unified Rule Engine Message Envelope
```json
{
  "id": "msg-8f7a912e-14b0",
  "type": "POST_TELEMETRY_REQUEST",
  "originator": {
    "entity_type": "ASSET",
    "entity_id": "ast-eq-pump"
  },
  "data": {
    "suction_pressure": 124.5,
    "discharge_pressure": 582.4,
    "bearing_vibration": 2.45
  },
  "metadata": {
    "source": "CENTUM_VP_DCS",
    "timestamp": "2026-10-11T10:00:00.000Z",
    "deviceName": "pump-p101a-hub-01",
    "assetName": "Crude Feed Charge Pump P-101A"
  },
  "context": {
    "correlation_id": "corr-4b2a89d1",
    "causation_id": null,
    "root_chain_id": "rc-root-01",
    "chain_version": 2,
    "depth": 0
  }
}
```

### 4.3 Data Flow & Integration Topology
```
[ Field Devices / OPC UA / MQTT / Modbus ]
                  │
                  ▼
         [ Ingestion Gateway ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 [ Redis Live Cache ]  [ Rule Engine Dispatcher ]
        │                   │
        │                   ▼
        │          [ Rule Chain Studio V2 ]
        │          (Filter ──> Enrich ──> Transform ──> Action ──> Forward)
        │                   │
        ▼                   ▼
 [ Function Block Studio V2 ] ───> [ Calculated Runtime Attributes ]
 (DAG Math / Thermodynamics / OEE) ──> [ Historical Points & Alarms ]
```

---

## 5. Incremental Implementation Plan

### Phase 1: Core Schemas, Envelopes & Asset Attribute Browser
1. Implement `UnifiedValueEnvelope` and `RuleEngineMessage` data models in Python and TypeScript.
2. Build the 5-level hierarchical `AssetAttributeBrowser` component with tag search, quality indicators, and type filtering.
3. Integrate the browser into both visual studio sidebars.

### Phase 2: Function Block Studio V2 & Comprehensive Block Registry
1. Implement the backend Function Block Registry (`fb_block_registry.py`) covering all 7 categories:
   - Asset Input (Attribute readers, constant, timestamp)
   - Math (Arithmetic, power, sqrt, abs, clamp, scale, custom formula)
   - Logic (Boolean gates, comparisons, if/else, select, switch)
   - Statistics (Moving average, rolling min/max, variance, percentile)
   - Time & Signal (Delta, rate of change, integrator, accumulator, deadband, hysteresis)
   - Industrial Calculation (Differential pressure, pump head, thermal efficiency, OEE, flow balance)
   - Output (Write runtime attribute, update KPI, publish event, execution log)
2. Build the 4-panel visual `FunctionBlockStudioV2.jsx` canvas with drag-and-drop nodes, curve connectors, parameter inspector, and live execution console.
3. Implement `fb_studio_engine.py` with DAG topological compiler, cycle detection, and historical replay simulator.

### Phase 3: ThingsBoard-Parity Visual Rule Chain Engine V2
1. Implement the complete 7-category Rule Node Registry in `rule_engine.py` (Filter, Enrichment, Transform, Action, External, Flow Control, Analytics).
2. Upgrade `RuleChainView.jsx` to `RuleChainStudioV2.jsx` with named relationship routing (`True`, `False`, `Success`, `Failure`, custom relations), nested chain invocation, and real-time execution trace visualization.
3. Connect Action and External nodes to existing alarm dispatchers (`alarm_forwarder.py`) and event forwarders (`event_forwarder.py`).

### Phase 4: Verification & End-to-End Validation
1. Verify graph compilation, cycle detection, and formula execution in Python and V8 sandbox.
2. Verify full disk persistence across app restarts via `dm_store_state.json`.
3. Validate frontend production build (`npm run build`) and test run simulation.
