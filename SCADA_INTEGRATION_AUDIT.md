# SCADA Integration Audit & Architecture Repair Plan
**Document Version:** 2.0.0  
**Target Platform:** Yokogawa AHI / ThingsBoard Industrial IIoT Suite  
**Subsystem:** Data Insight (DI) — SCADA Studio & Process Synoptics  
**Status:** Audit Complete — Phase 1 Repair Commencing  

---

## 1. Executive Summary & Audit Scope

The existing industrial web platform integrates Data Management (DM), Data Insight (DI), and Data Analytics (DA). A preliminary ThingsBoard-inspired SCADA feature was introduced, but it suffers from severe visual, layout, and functional integration defects:
1. It is not seamlessly integrated into the primary **Data Insight (DI)** navigation and header hierarchy.
2. The canvas editor experiences container overflow, fixed panel widths, and rigid z-index/flexbox constraints that cause horizontal scrollbars and clip canvas controls on laptop and tablet resolutions.
3. The symbol library is too limited (~15 symbols) for designing real process flow diagrams (P&IDs) across chemical, oil & gas, water, and power generation processes.
4. The piping engine lacks equipment anchor snapping, orthogonal routing, and dynamic endpoint tracking when equipment is moved.
5. Reusable industrial process templates (e.g., Single Pump System, Duty/Standby Assembly, Boiler Circuit, Chiller Loop) and composition builders (Motor + Coupling + Pump) do not exist.
6. The runtime viewer lacks a deliberate fullscreen kiosk display mode separate from the editor shell.

---

## 2. File & Component Inventory

| Component / Layer | Location | Status & Current Defects |
|---|---|---|
| **Global App Shell** | `frontend/src/App.jsx` | `diSubView` switches between `dashboards`, `assets`, and `scada` without exposing the required DI sub-tree (`Dashboards`, `SCADA Screens`, `SCADA Studio`, `Symbol Library`, `SCADA Templates`). `app-container` in DI lacks `overflow: hidden`, causing viewport spill. |
| **Global Navigation** | `frontend/src/components/Navbar.jsx` | Fixed sub-view toggle buttons; does not reflect the full DI SCADA hierarchy; lacks breadcrumbs and contextual toolbars for SCADA sub-views. |
| **SCADA Hub** | `frontend/src/views/di/scada/ScadaStudio.jsx` | Manages disconnected internal `viewMode` state (`screens`, `designer`, `runtime`, `symbols`, `editor`, `versions`) without synchronization with parent DI routes or breadcrumbs. |
| **SCADA Designer** | `frontend/src/views/di/scada/ScadaDesigner.jsx` | Fixed-width panels (`w-72` left, `w-80` right) cramp the center canvas (608px fixed width consumed). No collapsible or resizable panel gutters. Missing smart piping routing. Multi-select and canvas alignment tools incomplete. |
| **Runtime Viewer** | `frontend/src/views/di/scada/ScadaRuntimeViewer.jsx` | Missing dedicated fullscreen kiosk mode. Inefficient full-scene re-rendering on high-frequency telemetry. Stale/bad quality indicators not fully distinct. |
| **Symbol Library** | `frontend/src/views/di/scada/ScadaSymbolLibrary.jsx` | Only ~15 basic symbols. No symbol packs, categories under-represented, no composite symbol builder. |
| **Symbol Editor** | `frontend/src/views/di/scada/ScadaSymbolEditor.jsx` | Only single SVG upload. Does not support multi-part equipment composition (e.g. Motor + Coupling + Pump). |
| **Backend Router** | `backend/app/api/routes_scada.py` | Missing template endpoints, symbol pack export/import endpoints, and smart connection verification. |
| **Backend Service** | `backend/app/services/scada_service.py` | Built-in symbols limited to ~15. Missing template definitions, equipment connector schema, and composite symbol registration. |

---

## 3. Root Cause Analysis of Layout & Integration Defects

### 3.1. Parent Overflow & Viewport Height Constraints
- In `frontend/src/App.jsx`, when rendering DI mode, `<div className="app-container">` is used without `overflow: hidden`. In `index.css`, `.app-container` sets `height: 100vh; width: 100vw;` without strict clipping.
- Any canvas drag, panel expansion, or bottom diagnostic panel opening causes window-level scrollbars to appear, breaking the fixed industrial HMI layout.

### 3.2. Fixed-Width Panels & Canvas Cramping
- `ScadaDesigner.jsx` sets:
  - Left Panel: `w-72` (288px)
  - Right Panel: `w-80` (320px)
  - Bottom Panel: fixed `h-32` (128px)
- On standard 1366×768 or 1440×900 industrial control room monitors, the panels take up over 45% of screen width, leaving an unusable canvas sliver.
- Neither panel can be collapsed or resized with drag handles.

### 3.3. Disconnected Navigation & Hierarchy
- The user specified the exact structure required:
  ```
  Data Insight (DI)
  ├── Existing Dashboards
  ├── SCADA Screens
  ├── SCADA Studio
  ├── Symbol Library
  └── SCADA Templates
  ```
- Currently, users must click through multiple nested levels inside `ScadaStudio` to find the symbol library or screen list, with no persistent breadcrumbs or direct tabs.

### 3.4. Canvas Coordinate Scaling & Selection Matrix
- In `ScadaDesigner.jsx`, zoom and pan are applied via CSS transforms on a wrapper div around an SVG element, while mouse event calculations for drag operations do not consistently account for canvas origin offsets and viewbox aspect ratios.
- Rotating symbols uses SVG `rotate()` around element centers, but selection bounding boxes don't rotate with the element, creating visual misalignment.

### 3.5. Equipment Symbol Library Deficit
- Industrial P&IDs require distinct variations of pumps (centrifugal horizontal/vertical, multistage, positive displacement, vacuum, submersible), valves (gate, globe, ball, butterfly, check, pneumatic control, solenoid, safety relief), vessels, heat exchangers, motors, and instrumentation.
- The existing 15 symbols cannot model even basic refining, water treatment, or steam generation synoptics.

### 3.6. Lack of Smart Piping & Connector Routing
- In `ScadaDesigner.jsx`, `connectorMode` is declared but unlinked to any orthogonal routing algorithm (Manhattan/A* pathing) or equipment connection ports.
- Moving an equipment symbol leaves pipes disconnected in space.

---

## 4. Phase-by-Phase Repair & Redesign Plan

### Phase 1: Layout & DI Navigation Repair (Immediate)
1. **Unified Navigation Bar**: Update `Navbar.jsx` and `App.jsx` so that Data Insight cleanly presents the 5 core views:
   - `Existing Dashboards` (`diSubView = 'dashboards'`)
   - `SCADA Screens` (`diSubView = 'scada-screens'`)
   - `SCADA Studio` (`diSubView = 'scada-studio'`)
   - `Symbol Library` (`diSubView = 'scada-symbols'`)
   - `SCADA Templates` (`diSubView = 'scada-templates'`)
   - Plus preserve `Asset Twin` (`diSubView = 'assets'`).
2. **Container Overflow Normalization**: Apply strict `overflow: hidden` and flex column constraints to `.app-container` in DI mode.
3. **Collapsible & Resizable Panels**: Enhance `ScadaDesigner.jsx` with collapsible left, right, and bottom panels, collapsible tabs, and width presets.
4. **Fullscreen Kiosk Mode**: Implement native browser Fullscreen API and dedicated Kiosk display mode for `ScadaRuntimeViewer.jsx`.

### Phase 2: Canvas Engine & Scene Graph Redesign
1. Stable SVG scene graph with logical engineering coordinate system (`viewBox="0 0 W H"`).
2. Multi-select (box selection, shift-click), grouping/ungrouping, z-ordering, alignment guides (left, right, center, top, bottom, distribute horizontally/vertically).
3. Precision rotation (0°, 90°, 180°, 270° and freeform), horizontal/vertical mirroring (`flipX`, `flipY`).
4. Fit-to-screen computation based on canvas container dimensions.
5. Export to standalone SVG and JSON; import from JSON.

### Phase 3: Extensible Industrial Symbol Library (Target 250 Variants)
Implement high-fidelity, scalable, industrial SVG symbols across all 10 categories:
1. **Pumps** (25 variants): Centrifugal (ANSI/API-610 horizontal, vertical inline, multistage), Positive Displacement (Piston, Plunger, Diaphragm, Gear, Screw, Lobe, Peristaltic, Dosing), Submersible, Slurry, Vacuum, Duplex & Duty/Standby assemblies, Pump-Motor skids with VFD.
2. **Valves** (35 variants): Gate, Globe, Ball, Butterfly, Check, Needle, Plug, Diaphragm, PRV/Safety Relief, Control (Pneumatic diaphragm actuator, Electric multi-turn, Solenoid, Positioner), 3-Way, 4-Way, Knife Gate, Pinch, Angle, ESDV, MOV, Double Block & Bleed.
3. **Tanks & Vessels** (25 variants): Vertical Storage, Horizontal Bullet, Open Sump, Cone Bottom, Silo, Spherical Pressure Vessel, Reactor with Jacketing, Separation Drum (Knockout, Flash, 2-phase, 3-phase), Agitated Tank, Deaerator, Column / Distillation Tower, Scrubber, Filter Vessel.
4. **Rotating Equipment** (30 variants): AC Induction Motor, DC Motor, Servo Motor, Gearbox (Helical, Planetary), Compressors (Centrifugal, Reciprocating, Screw, Axial), Fans & Blowers (Centrifugal, Axial, ID Fan, FD Fan, Cooling Fan), Steam Turbine, Gas Turbine, Agitators & Mixers.
5. **Thermal Equipment** (25 variants): Boilers (Watertube, Firetube), Furnaces, Burners, Shell & Tube Heat Exchanger, Plate & Frame Exchanger, Air Cooled Fin-Fan, Cooling Tower, Chiller (Centrifugal, Absorption), Reboiler, Superheater, Economizer, Steam Drum.
6. **Instrumentation** (35 variants): Transmitters (PT, TT, FT, LT, DPT, PIT, TIT, FIT, LIT), Discrete Switches (PSH, PSL, TSH, TSL, LSH, LSL, FSH), Analyzers (pH, Conductivity, O2, Gas Chromatograph), Local Gauges (Bourdon tube, Thermowell dial, Sight glass), Vibration & Speed probes.
7. **Piping & Fittings** (35 variants): Straight pipes, 90°/45° elbows, tees, crosses, concentric/eccentric reducers, flanges, strainers (Y-type, basket), steam traps, vents, drains, flow direction arrows, expansion joints, insulated/heat-traced lines.
8. **Electrical** (20 variants): Transformers (step-up, step-down), Breakers, Disconnects/Isolators, Contactors, Relays, Busbars, VFD cubicles, MCC sections, UPS, Battery banks, Power meters, Generator sets.
9. **Material Handling** (15 variants): Belt Conveyors, Screw Conveyors, Bucket Elevators, Roller Conveyors, Vibratory Feeders, Hoppers, Crushers, Screens, Centrifuges, Filter Presses.
10. **HMI Elements & Controls** (15 variants): Digital Process Indicators, Analog Bar Gauges, Radial Gauges, Status Beacons (Green/Yellow/Red/Blue), High-Performance HMI Alarm Indicators, Industrial Pushbuttons, Multi-position Selector Switches, Emergency Stop E-Stops.

### Phase 4: Custom Equipment Symbol Builder & Multi-Part Compositor
- Visual symbol builder allowing engineers to import SVG files or combine simple SVG symbols (e.g. Motor + Coupling + Centrifugal Pump = Pump Skid Assembly).
- Define connection anchor points (Inlet, Outlet, Electrical, Signal).
- Configure state bindings, rotation/pulsing behaviors, and tag mappings without writing frontend code.
- Strict anti-XSS XML sanitization.

### Phase 5: Smart Pipe & Connection Routing Engine
- Definitive anchor ports on equipment (e.g. `port-suction` at `x=0, y=35`, `port-discharge` at `x=35, y=0`).
- Orthogonal routing engine generating clean 90° pipe runs with bend points.
- Endpoint tracking: moving equipment dynamically recalculates connected pipe paths.
- Flow animation responding to live telemetry (running/stopped/flow rate).

### Phase 6: Direct Asset Hierarchy & Attribute Binding
- Seamless integration with DM Asset Hierarchy (`dm_store.assets`).
- Direct mapping to Static, Dynamic, and Runtime Asset Attributes.
- Multi-state visual rules (Running color, Stopped color, Alarm flashing, Dynamic Level fill, Rotation speed).

### Phase 7: Reusable Process Templates Catalog
- Pre-built industrial scenes:
  1. Single Pump Transfer Skid
  2. Duty / Standby Duplex Pump Assembly
  3. Centrifugal Compressor Train with Cooler & Knockout Drum
  4. Boiler & Steam Distribution Header
  5. Shell & Tube Heat Exchanger Cooling Loop
  6. Multi-Tank Chemical Storage Farm
  7. Industrial Chiller & Cooling Tower Circuit
- Template insertion wizard with asset role assignment.

### Phase 8 & 9: Live Operation & Backend Persistence
- Subscriptions via `/ws/di/scada/live` and `/api/v2/di/scada/values/snapshot`.
- Immutable published screen snapshots (`scada_screen_versions`).
- Role-based publication security.

---

## 5. Acceptance Verification Matrix

All 20 acceptance tests from Phase 11 will be executed and validated to verify complete operational reliability.
