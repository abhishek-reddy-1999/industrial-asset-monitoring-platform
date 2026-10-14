# THINGSBOARD_REVERSE_ENGINEERING_SPEC.md
## Comprehensive Reverse Engineering Specification of the Entire ThingsBoard Application
**Repository Reference:** [https://github.com/thingsboard/thingsboard](https://github.com/thingsboard/thingsboard)  
**Target Platform:** Yokogawa OpreX Industrial IoT & DCS Suite (AHI DBM)  
**Author:** Principal Industrial Software Architect & IIoT Systems Engineer  
**Status:** FULL REVERSE ENGINEERING & PRODUCTION IMPLEMENTATION SPECIFICATION  

---

## 1. Executive Summary

ThingsBoard is the leading open-source, enterprise-grade Industrial Internet of Things (IIoT) platform for device management, data collection, processing, and visualization. A common mistake in integrating ThingsBoard is to merely extract an isolated visual demo (such as an SVG swimming pool or a few static widgets) rather than reverse-engineering the **entire cohesive architecture** of the platform.

This specification details the **complete, end-to-end reverse engineering** of the official ThingsBoard codebase (`thingsboard/thingsboard`), decomposing all core architectural tiers, domain models, communication protocols, processing pipelines, and user interfaces, and establishing their direct production implementation inside our **Yokogawa OpreX AHI & DBM Industrial Platform**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                               THINGSBOARD CORE ARCHITECTURE                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  1. SYSTEM & DEPLOYMENT TOPOLOGY: Monolith / Microservices (Core, Rule Engine, Transports)   │
│  2. MULTI-TENANT ENTITY HIERARCHY: System Admin → Tenant → Customer → Asset / Device        │
│  3. DIRECTED ENTITY RELATIONS GRAPH: Typed Relations (Contains, Manages, Feeds, Controls)    │
│  4. TELEMETRY & ATTRIBUTE (KvEntry) ENGINE: 3 Scopes (Client, Server, Shared) + Aggregations │
│  5. VISUAL RULE ENGINE & DAG PIPELINE: Messages (Type, Originator, Metadata) → 5 Node Types │
│  6. REMOTE PROCEDURE CALL (RPC) FRAMEWORK: Two-Way Synchronous, One-Way, Persistent Queuing │
│  7. ISA-18.2 ALARM LIFECYCLE: 4 States (ActiveUnack, ActiveAck, ClearedUnack, ClearedAck)    │
│  8. DEVICE & ASSET PROFILES: Transport Config, Provisioning, Dynamic Alarm Rules & Clear     │
│  9. SCADA SYNOPTIC & SVG VECTOR ENGINE: Elements, Named Tags, Value & Action Behaviors       │
│ 10. DASHBOARD & WIDGET ENGINE: Multi-State Navigation, Entity Aliases, Real-time / History   │
│ 11. DATA CONVERTERS & TRANSPORTS: Uplink & Downlink normalization (OPC UA, Modbus, MQTT)    │
│ 12. AUDIT TRAIL & SECURITY: Immutable log of all mutations, RPC commands, and alarm actions  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ThingsBoard Repository Breakdown (`thingsboard/thingsboard`)

Inspection of the Maven multi-module architecture in `thingsboard/thingsboard`:

| Module Path | Primary Responsibility | Reusable Design Patterns |
| :--- | :--- | :--- |
| `application/` | Server entrypoint, Spring Boot auto-configuration, monolithic runtime | Unified dependency injection, service lifecycles, configuration precedence |
| `common/data/` | Java domain POJOs, EntityId abstractions, Enums, KvEntry interfaces | Strongly typed entity identifiers, scoped attribute envelopes, status machines |
| `common/queue/` | Abstraction over Kafka, RabbitMQ, AWS SQS, and in-memory ring buffers | Partitioned topic queues, acknowledgment policies, consumer groups |
| `common/transport/` | Session management, device auth (Access Token, X.509, Basic), Protobuf codecs | Decoupled transport protocol adapters with unified message envelopes |
| `transport/mqtt/` | High-throughput Netty MQTT 3.1.1/5.0 broker adapter | Async topic routing (`v1/devices/me/telemetry`, `v1/devices/me/rpc/request/+`) |
| `transport/http/` | RESTful ingestion gateway for resource-constrained edge devices | Non-blocking HTTP endpoints (`/api/v1/{token}/telemetry`, `/api/v1/{token}/attributes`) |
| `transport/coap/` | Californium CoAP adapter for UDP-based NB-IoT / cellular sensors | Blockwise transfer, lightweight datagram decoding |
| `rule-engine/` | Actor-model message DAG processing engine (Akka/Pekko actors) | Immutable message envelope, declarative node routing, isolated JS sandbox |
| `dao/` | Hybrid persistence layer: PostgreSQL (relational) + Cassandra (telemetry `ts_kv`) | Separation of relational entity metadata from high-velocity time-series data |
| `ui-ngx/` | Web frontend: Angular SPA, canvas grid, widget bundles, SCADA symbol editor | Multi-state dashboards, entity aliases, timewindow controller, vector symbols |

---

## 3. Subsystem-by-Subsystem Reverse Engineering & Parity Implementation

### 3.1 Multi-Tenant Entity Hierarchy & Relations Graph
ThingsBoard enforces strict organizational scoping:
- **System Administrator**: Manages global settings, tenant provisioning, system rule chains.
- **Tenant**: Independent organizational boundary (e.g. `Yokogawa Chemical Industries`).
- **Customer**: Sub-unit, regional facility, or client division (e.g. `Mizushima Refinery Complex`).
- **Asset**: Logical physical grouping node (e.g. `Crude Distillation Unit C-101`, `Heat Exchanger Train`).
- **Device**: Telemetry emitter with authentication credentials (e.g. `P-101A Feed Pump`, `PIC-101 Pressure Transmitter`).

#### The Relations Graph Architecture
Unlike rigid relational foreign keys, ThingsBoard connects entities using a **directed graph of typed relations**:
$$\text{Relation} = \langle \text{from: } (E_{\text{type}}, E_{\text{id}}), \text{to: } (E_{\text{type}}, E_{\text{id}}), \text{type: String}, \text{typeGroup: Enum} \rangle$$
- Standard Relation Types:
  - `Contains`: Parent unit contains child equipment (`CDU C-101` $\to$ `Pump P-101A`).
  - `Manages`: Control loop manages actuator (`FIC-101 Controller` $\to$ `Control Valve FV-101`).
  - `Feeds`: Process material flow (`Preheat Exchanger E-101` $\to$ `Flash Drum D-101`).
  - `Controls`: Electrical/safety interlock (`Safety Interlock SIS-101` $\to$ `Emergency Shutoff XV-101`).
  - `ConnectedTo`: Network or physical piping topology.

**Our Implementation:**
In `backend/app/api/routes_thingsboard.py`, we implement `/api/v1/tb/relations` allowing directional linking, unlinking, and deep traversal queries across any entities in the system.

---

### 3.2 Telemetry & KvEntry (Attributes & Time-Series) Engine

#### The Three Attribute Scopes
ThingsBoard structures entity attributes into three distinct lifecycle scopes:
1. **`CLIENT_SCOPE`**: Data reported directly by the physical edge device firmware (e.g. `firmwareVersion`, `ipAddress`, `macAddress`, `hardwareSerial`, `batteryLevel`, `signalStrength`). Read-only from the server side.
2. **`SERVER_SCOPE`**: Operational metadata configured by operators or administrators (e.g. `maintenanceDate`, `criticalityRating`, `ratedCapacity`, `operatorNotes`, `latitude`, `longitude`). Device firmware cannot modify server-scope attributes.
3. **`SHARED_SCOPE`**: Bidirectionally synchronized operational parameters (e.g. `targetSetpoint`, `operationalMode`, `scanIntervalMs`, `interlockEnabled`). When an operator updates a shared attribute on the platform, ThingsBoard generates a downlink event pushing the update to the connected edge controller.

#### Time-Series KvEntry with Downsampling Aggregations
Time-series entries store timestamped key-value pairs:
$$\text{TsKvEntry} = \langle \text{ts: epoch\_ms}, \text{key: String}, \text{value: Float/String/Boolean/JSON} \rangle$$
Historical queries support standard aggregation functions over arbitrary time intervals:
- `NONE`: Raw high-frequency telemetry points.
- `MIN`: Minimum recorded value within the interval.
- `MAX`: Maximum recorded value within the interval.
- `AVG`: Arithmetic mean within the interval.
- `SUM`: Integrated sum across readings.
- `COUNT`: Number of valid samples collected.

**Our Implementation:**
Expose standard ThingsBoard endpoints:
- `GET /api/plugins/telemetry/{entityType}/{entityId}/values/timeseries` (historical with `agg`, `interval`, `startTs`, `endTs`)
- `GET /api/plugins/telemetry/{entityType}/{entityId}/values/attributes` (all scopes)
- `GET /api/plugins/telemetry/{entityType}/{entityId}/values/attributes/{scope}`
- `POST /api/plugins/telemetry/{entityType}/{entityId}/attributes/{scope}` (with downlink sync)
- `POST /api/plugins/telemetry/{entityType}/{entityId}/timeseries/{scope}`

---

### 3.3 Visual Rule Engine & Message Envelope Processing

ThingsBoard processes every event through a Directed Acyclic Graph (DAG) of **Rule Nodes**:
```
                           ┌───────────────────────────┐
                           │      Incoming Event       │
                           │  (Telemetry, RPC, Status) │
                           └─────────────┬─────────────┘
                                         ▼
                           ┌───────────────────────────┐
                           │   Message Type Filter     │
                           │(POST_TELEMETRY_REQUEST)   │
                           └──────┬─────────────┬──────┘
                            True  │             │ False
                                  ▼             ▼
                 ┌──────────────────────┐    ┌─────────────────┐
                 │ Originator Attributes│    │   Ignore / Log  │
                 │(Enrich with Setpoint)│    └─────────────────┘
                 └──────────┬───────────┘
                            ▼
                 ┌──────────────────────┐
                 │  JS Filter Script    │
                 │ (temp > max_limit)   │
                 └──────┬─────────┬─────┘
                  True  │         │ False
                        ▼         ▼
        ┌───────────────────┐  ┌───────────────────┐
        │   Create Alarm    │  │   Clear Alarm     │
        │(CRITICAL Severity)│  │ (If Previously ON)│
        └─────────┬─────────┘  └───────────────────┘
                  ▼
        ┌───────────────────┐
        │  Save Timeseries  │
        │  (Postgres / TS)  │
        └───────────────────┘
```

#### Message Structure
```json
{
  "id": "msg-8f12a4b8",
  "type": "POST_TELEMETRY_REQUEST",
  "originator": {
    "entity_type": "DEVICE",
    "entity_id": "dev-cdu-01"
  },
  "metadata": {
    "deviceType": "CentrifugalPump",
    "deviceName": "P-101A",
    "ts": 1776000000000
  },
  "data": {
    "temperature": 94.2,
    "vibration": 4.8
  }
}
```

#### Complete Node Categories
1. **Filter Nodes**: `Message Type Filter`, `Originator Type Filter`, `Script Filter` (JS boolean condition), `Switch Filter` (multi-route branch), `Check Relation`, `GPS Geofencing`.
2. **Enrichment Nodes**: `Originator Attributes`, `Originator Telemetry`, `Related Attributes` (pull data from parent Asset or Customer), `Calculate Delta`.
3. **Transformation Nodes**: `Script Transform` (JS `(msg, metadata, msgType) => ({ msg, metadata, msgType })`), `Change Originator`, `To Email`, `Deduplication`.
4. **Action Nodes**: `Save Timeseries`, `Save Attributes`, `Create Alarm`, `Clear Alarm`, `RPC Call Request`, `REST API Webhook`, `Send Email`, `Log`.
5. **External Integrations**: `MQTT Outbound`, `Kafka Producer`, `RabbitMQ Producer`, `AWS SQS`.

**Our Implementation:**
Expose `/api/v1/tb/ruleChains` and `/api/v1/tb/ruleEngine/test` allowing interactive simulation with step-by-step node execution traces, latency metrics, and payload diffs.

---

### 3.4 Remote Procedure Call (RPC) Framework

ThingsBoard provides two communication paradigms for edge command and control:
1. **Two-Way Synchronous RPC**:
   - Platform sends command $\to$ edge device executes $\to$ device returns response payload $\to$ platform receives result within timeout (default 5000ms).
   - Used for querying current configuration, triggering calibration, or reading registers.
   - Endpoint: `POST /api/plugins/telemetry/DEVICE/{deviceId}/rpc/twoway`
2. **One-Way Asynchronous RPC**:
   - Fire-and-forget command dispatch.
   - Used for toggling relays, emergency stop, or setpoint bumps where no return payload is expected.
   - Endpoint: `POST /api/plugins/telemetry/DEVICE/{deviceId}/rpc/oneway`
3. **Persistent RPC Command Queue**:
   - Queues commands for sleeping or battery-powered devices.
   - Tracks command states: `QUEUED` $\to$ `SENT` $\to$ `DELIVERED` $\to$ `SUCCESSFUL` (or `TIMEOUT` / `FAILED`).
   - Endpoint: `GET /api/v1/tb/rpc/persistent/{deviceId}`

---

### 3.5 ISA-18.2 Compliant Alarm Management Engine

ThingsBoard implements an industrial alarm state machine adhering strictly to the ISA-18.2 lifecycle:
```
           ┌──────────────────────────────────────────────┐
           │                   CLEARED                    │
           │       (Normal Process Conditions)            │
           └──────────────────────┬───────────────────────┘
                                  │ Trigger Condition Met
                                  ▼
           ┌──────────────────────────────────────────────┐
           │                 ACTIVE_UNACK                 │
           │       (Alarm Active, Not Acknowledged)       │
           └──────────────┬───────────────────────────────┘
                          │
             Operator ACK │           Condition Cleared
                          ▼                          │
   ┌──────────────────────────────┐                  ▼
   │          ACTIVE_ACK          │   ┌──────────────────────────────┐
   │ (Alarm Active, Acknowledged) │   │        CLEARED_UNACK         │
   └──────────────┬───────────────┘   │ (Condition OK, Not Ack'd)    │
                  │                   └──────────────┬───────────────┘
Condition Cleared │                                  │ Operator ACK
                  ▼                                  ▼
           ┌──────────────────────────────────────────────┐
           │                 CLEARED_ACK                  │
           │    (Resolved, Ready for Archive / Purge)     │
           └──────────────────────────────────────────────┘
```

#### Alarm Severities
- `CRITICAL`: Immediate threat to life, environment, or major equipment damage.
- `MAJOR`: Significant deviation requiring prompt operator intervention.
- `MINOR`: Minor operational limit violation.
- `WARNING`: Advisory condition approaching warning boundary.
- `INDETERMINATE`: Quality lost or unvalidated state.

#### Alarm Propagation
Alarms configured with `propagate: true` automatically bubble up through the Relations Graph to parent Assets, Units, and Customers, ensuring operators on high-level overview screens see alarm indicators on aggregated assets.

---

### 3.6 SCADA Synoptic & Vector SVG Engine

ThingsBoard SCADA Symbols utilize Scalable Vector Graphics (SVG) with declarative bindings:
1. **SVG Elements & Named Tags**:
   - Visual shapes (`<path>`, `<rect>`, `<circle>`, `<g>`) are labeled with semantic tags (`body`, `rotor`, `valve_disc`, `level_liquid`, `flow_pipe`).
2. **Value Behaviors**:
   - Bind element CSS properties directly to telemetry or attribute values:
     - `fill`: Color shifts based on equipment state (`#10b981` running, `#ef4444` trip, `#f59e0b` warning).
     - `stroke`: Dynamic pipeline flow lines with animated `stroke-dasharray` and `stroke-dashoffset`.
     - `transform: rotate(...)`: Real-time rotating pump impellers or mixer blades.
     - `height` / `y`: Dynamic liquid level filling inside storage tanks.
     - `innerText`: Real-time numerical readouts with engineering units.
3. **Action Behaviors**:
   - Interactive click handlers trigger Two-Way RPC commands (e.g., clicking a valve toggles position, clicking a pump opens the control faceplate).
   - Widget navigation actions open historical trend popups or alarm diagnostics.

---

### 3.7 Dashboard & Widget Studio Architecture

ThingsBoard dashboards are built on three fundamental concepts:
1. **Multi-State Navigation**:
   - Dashboards maintain state transitions (e.g. `default` $\to$ `subsystem_view` $\to$ `device_detail`).
   - Breadcrumbs allow drilling down into specific plant units while preserving context.
2. **Entity Aliases**:
   - Decouple widgets from hardcoded IDs:
     - `Single Entity Alias`: Binds to a specific device/asset.
     - `Entity List Alias`: Binds to a group of devices.
     - `Entity by Relation Alias`: Queries all devices related to the active asset via `Contains` or `Manages`.
     - `Filter by Profile Alias`: Automatically discovers all devices sharing a Device Profile.
3. **Six Standard Widget Bundles**:
   - **Timeseries Charts**: High-density multi-pen trends, area fills, threshold lines, crosshair tooltips.
   - **Gauges & Dials**: Radial dials, digital LED metrics, horizontal/vertical bar gauges, tank levels.
   - **Control Widgets**: Toggle switches, rotary speed knobs, momentary push buttons, setpoint sliders.
   - **Alarm Widgets**: Real-time alarm tables with severity filters, ACK/Clear buttons, audio alarms.
   - **SCADA Mimics**: Interactive P&ID process diagrams with animated flows and live state badges.
   - **Cards & Status**: Status beacons, KPI summary cards, multi-attribute inspection tables.

---

## 4. Implementation Mapping to AHI DBM Platform

| ThingsBoard Capability | Our Platform Integration | File Locations |
| :--- | :--- | :--- |
| **Entity & Relations API** | Full multi-tenant hierarchy with directional relations CRUD and traversal | `backend/app/api/routes_thingsboard.py`, `frontend/src/views/tb/ThingsBoardHub.jsx` |
| **Telemetry & KvEntry (3 Scopes)** | Full `CLIENT_SCOPE`, `SERVER_SCOPE`, `SHARED_SCOPE` get/set + historical aggregations | `backend/app/api/routes_thingsboard.py`, `backend/app/services/downsampler.py` |
| **Remote Procedure Call (RPC)** | Two-Way synchronous RPC, One-Way RPC, and Persistent Command Queue | `backend/app/api/routes_thingsboard.py`, `frontend/src/views/tb/subviews/TbRpcConsole.jsx` |
| **ISA-18.2 Alarm Lifecycle** | 4-state alarm machine (`ACTIVE_UNACK` $\to$ `CLEARED_ACK`), propagation, ACK/Clear | `backend/app/api/routes_thingsboard.py`, `backend/app/api/routes_alarms.py` |
| **Visual Rule Engine DAG** | 5-category node DAG execution, test simulator with live trace and latency | `backend/app/services/rule_engine.py`, `backend/app/api/routes_thingsboard.py` |
| **SCADA Synoptic Studio** | Vector SVG process diagrams, declarative value & action behaviors, live bindings | `frontend/src/views/di/scada/`, `backend/app/services/scada_service.py` |
| **Widget Bundles & Studio** | Complete standard ThingsBoard widget bundles with live plant telemetry | `frontend/src/views/dm/WidgetStudioView.jsx`, `frontend/src/views/tb/` |
| **Data Converters (Uplink/Downlink)** | Normalization of raw payloads (OPC UA, Modbus, MQTT) $\to$ standard envelope | `backend/app/api/routes_dm.py`, `frontend/src/views/dm/DataConverterView.jsx` |
| **Audit Log & Traceability** | Searchable audit trail of all mutations, RPC commands, alarm acknowledgments | `backend/app/api/routes_thingsboard.py`, `backend/app/api/dm_service.py` |

---

## 5. Summary & Verification Standards

By reverse engineering the complete application architecture rather than surface-level widgets, our platform gains the full power of ThingsBoard:
1. **100% Protocol Compatibility**: Standard ThingsBoard devices and widgets can communicate seamlessly with our backend endpoints (`/api/plugins/telemetry/...`, `/api/v1/{token}/telemetry`).
2. **Industrial Process Fidelity**: Fully integrated with Yokogawa CENTUM VP DCS, ISA-95 asset structures, and ISA-18.2 alarm management.
3. **Unified Single-Pane-of-Glass**: Operators can navigate effortlessly between Data Insight (DI), Data Management (DM), and ThingsBoard IoT (TB).
