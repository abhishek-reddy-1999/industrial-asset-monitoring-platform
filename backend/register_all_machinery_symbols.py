import json
import os
import re

# Read SVG contents from ThingsBoard official files if needed
def get_tb_svg(name):
    p = f"frontend/public/assets/scada/thingsboard/{name}.svg"
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            c = f.read()
            # extract inner or return cleaned
            return c
    return ""

tb_pump_svg = get_tb_svg("pump")
tb_tank_svg = get_tb_svg("tank")
tb_fluid_filtration_svg = get_tb_svg("fluid-filtration")
tb_fluid_svg = get_tb_svg("fluid")
tb_tank_level_svg = get_tb_svg("tank-level-monitoring")
tb_pump_mgmt_svg = get_tb_svg("pump-monitoring-management")
tb_flow_svg = get_tb_svg("flow")

print(f"Loaded TB SVGs. Pump len: {len(tb_pump_svg)}, Tank len: {len(tb_tank_svg)}")

NEW_MACHINERY_SYMBOLS = [
    # 1. 3D POOL PUMP
    {
        "id": "sym-3d-pool-pump",
        "name": "3D Photorealistic Pool Circulation Pump (ThingsBoard Hi-Res)",
        "category": "Pumps",
        "subcategory": "3D Equipment",
        "description": "Commercial pool circulation pump with cooling fins, heavy cast iron casing, and base mount in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 140,
        "default_height": 95,
        "tags": ["3d_render", "centrifugal_pump", "motor", "casing", "circulation"],
        "ports": [
            {"id": "suction", "name": "Suction Flange", "x": 4, "y": 48, "direction": "LEFT", "type": "INLET"},
            {"id": "discharge", "name": "Discharge Flange", "x": 36, "y": 4, "direction": "TOP", "type": "OUTLET"},
            {"id": "drain", "name": "Casing Drain", "x": 130, "y": 80, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "glow", "target": "run_glow", "trigger": "running"},
            {"type": "fill", "target": "status_led", "trigger": "state_color"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 95" width="140" height="95">
  <defs>
    <filter id="pGlow3d" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect id="run_glow" x="2" y="2" width="136" height="91" rx="8" fill="#22c55e" fill-opacity="0" stroke="#22c55e" stroke-width="0"/>
  <image href="/assets/scada/symbols_3d/water_pump_3d.png" x="0" y="0" width="140" height="95" preserveAspectRatio="xMidYMid meet" />
  <circle id="status_led" cx="125" cy="18" r="4" fill="#22c55e" stroke="#0f172a" stroke-width="1.5"/>
</svg>"""
    },

    # 2. 3D SAND FILTER
    {
        "id": "sym-3d-sand-filter",
        "name": "3D Commercial Sand Filter with Multi-Port Valve (ThingsBoard Hi-Res)",
        "category": "Water Treatment & Pool",
        "subcategory": "3D Equipment",
        "description": "High-rate fiberglass sand filter with integrated 6-position multiport valve and pressure gauge in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 110,
        "default_height": 145,
        "tags": ["3d_render", "sand_filter", "multiport_valve", "filtration"],
        "ports": [
            {"id": "inlet", "name": "Filter Inlet", "x": 4, "y": 25, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Filter Outlet", "x": 106, "y": 25, "direction": "RIGHT", "type": "OUTLET"},
            {"id": "waste", "name": "Backwash Waste", "x": 106, "y": 45, "direction": "RIGHT", "type": "OUTLET"},
            {"id": "drain", "name": "Winter Drain", "x": 55, "y": 140, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "fill", "target": "mode_led", "trigger": "state_color"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 145" width="110" height="145">
  <image href="/assets/scada/symbols_3d/sand_filter_3d.png" x="0" y="0" width="110" height="145" preserveAspectRatio="xMidYMid meet" />
  <circle id="mode_led" cx="42" cy="74" r="3.5" fill="#22c55e" stroke="#0f172a" stroke-width="1.2"/>
</svg>"""
    },

    # 3. 3D HEAT PUMP
    {
        "id": "sym-3d-heat-pump",
        "name": "3D Commercial Inverter Pool Heat Pump & Chiller (ThingsBoard Hi-Res)",
        "category": "Thermal Equipment",
        "subcategory": "3D Equipment",
        "description": "Air-source pool inverter heat pump with digital LED setpoint display and axial fan grill in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 155,
        "default_height": 120,
        "tags": ["3d_render", "heat_pump", "chiller", "compressor", "pool_heating"],
        "ports": [
            {"id": "water_in", "name": "Cold Water In", "x": 4, "y": 32, "direction": "LEFT", "type": "INLET"},
            {"id": "water_out", "name": "Hot Water Out", "x": 4, "y": 85, "direction": "LEFT", "type": "OUTLET"},
            {"id": "power", "name": "Main Power", "x": 145, "y": 110, "direction": "RIGHT", "type": "ELECTRICAL"}
        ],
        "behaviors": [
            {"type": "rotation", "target": "fan_blades", "trigger": "running", "speed": 2.5}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 155 120" width="155" height="120">
  <image href="/assets/scada/symbols_3d/heat_pump_3d.png" x="0" y="0" width="155" height="120" preserveAspectRatio="xMidYMid meet" />
  <circle cx="112" cy="56" r="34" fill="none" stroke="#22c55e" stroke-width="1.2" opacity="0.4"/>
</svg>"""
    },

    # 4. 3D POOL BASIN
    {
        "id": "sym-3d-pool-basin",
        "name": "3D Commercial Swimming Pool Basin (ThingsBoard Hi-Res Cutaway)",
        "category": "Water Treatment & Pool",
        "subcategory": "3D Equipment",
        "description": "Commercial swimming pool basin with deep water reflections and coping lip in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 320,
        "default_height": 110,
        "tags": ["3d_render", "swimming_pool", "basin", "reservoir", "water"],
        "ports": [
            {"id": "skimmer", "name": "Skimmer Outlet", "x": 4, "y": 55, "direction": "LEFT", "type": "OUTLET"},
            {"id": "main_drain", "name": "Main Bottom Drain", "x": 160, "y": 105, "direction": "BOTTOM", "type": "OUTLET"},
            {"id": "return_jets", "name": "Filtered Water Return", "x": 315, "y": 55, "direction": "RIGHT", "type": "INLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 110" width="320" height="110">
  <image href="/assets/scada/symbols_3d/pool_basin_3d.png" x="0" y="0" width="320" height="110" preserveAspectRatio="none" />
  <rect x="2" y="2" width="316" height="106" rx="4" fill="none" stroke="#475569" stroke-width="1.5"/>
</svg>"""
    },

    # 5. 3D SPOKE GATE VALVE
    {
        "id": "sym-3d-spoke-valve",
        "name": "3D Industrial Spoke Handwheel Gate Valve (ThingsBoard Hi-Res)",
        "category": "Valves",
        "subcategory": "3D Equipment",
        "description": "Flanged isolation gate valve with 4-spoke green handwheel in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 90,
        "default_height": 42,
        "tags": ["3d_render", "gate_valve", "handwheel", "flanged"],
        "ports": [
            {"id": "inlet", "name": "Inlet Flange", "x": 4, "y": 21, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Outlet Flange", "x": 86, "y": 21, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 42" width="90" height="42">
  <image href="/assets/scada/symbols_3d/spoke_gate_valve_3d.png" x="0" y="0" width="90" height="42" preserveAspectRatio="xMidYMid meet" />
</svg>"""
    },

    # 6. 3D FLOW METER
    {
        "id": "sym-3d-flow-meter",
        "name": "3D Digital Electromagnetic Flow Meter (ThingsBoard Hi-Res)",
        "category": "Instrumentation",
        "subcategory": "3D Equipment",
        "description": "In-line magnetic flow meter with circular housing and digital LCD flow reading in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 65,
        "default_height": 60,
        "tags": ["3d_render", "flow_meter", "magmeter", "telemetry"],
        "ports": [
            {"id": "inlet", "name": "Process Inlet", "x": 4, "y": 30, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Process Outlet", "x": 61, "y": 30, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 60" width="65" height="60">
  <image href="/assets/scada/symbols_3d/flow_meter_3d.png" x="0" y="0" width="65" height="60" preserveAspectRatio="xMidYMid meet" />
</svg>"""
    },

    # 7. 3D LINT STRAINER
    {
        "id": "sym-3d-lint-strainer",
        "name": "3D Hair & Lint Pre-Strainer Trap (ThingsBoard Hi-Res)",
        "category": "Piping and Fittings",
        "subcategory": "3D Equipment",
        "description": "Pre-filtration basket strainer pot mounted upstream of pumps in high-resolution 3D.",
        "version": "3.0.0",
        "default_width": 45,
        "default_height": 95,
        "tags": ["3d_render", "strainer", "pre_filter", "basket"],
        "ports": [
            {"id": "inlet", "name": "Suction Inlet", "x": 4, "y": 25, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Pump Outlet", "x": 41, "y": 25, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 95" width="45" height="95">
  <image href="/assets/scada/symbols_3d/lint_strainer_3d.png" x="0" y="0" width="45" height="95" preserveAspectRatio="xMidYMid meet" />
</svg>"""
    },

    # 8. THINGSBOARD STORAGE TANK (Vector)
    {
        "id": "sym-tb-process-tank",
        "name": "ThingsBoard High-Capacity Process Tank (Official Vector)",
        "category": "Tanks and Vessels",
        "subcategory": "Process Vessels",
        "description": "ThingsBoard official vector asset for atmospheric storage and process holding tanks.",
        "version": "3.0.0",
        "default_width": 120,
        "default_height": 95,
        "tags": ["thingsboard", "tank", "storage", "vessel"],
        "ports": [
            {"id": "inlet", "name": "Top Inlet", "x": 60, "y": 4, "direction": "TOP", "type": "INLET"},
            {"id": "outlet", "name": "Bottom Drain", "x": 60, "y": 91, "direction": "BOTTOM", "type": "OUTLET"},
            {"id": "side_in", "name": "Side Feed", "x": 4, "y": 48, "direction": "LEFT", "type": "INLET"},
            {"id": "side_out", "name": "Side Discharge", "x": 116, "y": 48, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": tb_tank_svg if tb_tank_svg else '<svg viewBox="0 0 120 95" width="120" height="95"><rect width="120" height="95" rx="8" fill="#1e293b"/></svg>'
    },

    # 9. THINGSBOARD PROCESS PUMP (Vector)
    {
        "id": "sym-tb-heavy-pump",
        "name": "ThingsBoard Heavy Impeller Process Pump (Official Vector)",
        "category": "Pumps",
        "subcategory": "Centrifugal",
        "description": "ThingsBoard official vector asset for industrial heavy-duty centrifugal process pumps.",
        "version": "3.0.0",
        "default_width": 110,
        "default_height": 95,
        "tags": ["thingsboard", "pump", "impeller", "industrial"],
        "ports": [
            {"id": "suction", "name": "Suction Port", "x": 4, "y": 55, "direction": "LEFT", "type": "INLET"},
            {"id": "discharge", "name": "Discharge Port", "x": 55, "y": 4, "direction": "TOP", "type": "OUTLET"},
            {"id": "drain", "name": "Casing Drain", "x": 95, "y": 91, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": tb_pump_svg if tb_pump_svg else '<svg viewBox="0 0 110 95" width="110" height="95"><circle cx="55" cy="55" r="35" fill="#16a34a"/></svg>'
    },

    # 10. THINGSBOARD FLUID FILTRATION
    {
        "id": "sym-tb-fluid-filter",
        "name": "ThingsBoard Multi-Stage Fluid Filtration Unit (Official Vector)",
        "category": "Water Treatment & Pool",
        "subcategory": "Filtration",
        "description": "ThingsBoard official vector asset for multi-stage fluid and water filtration plants.",
        "version": "3.0.0",
        "default_width": 120,
        "default_height": 105,
        "tags": ["thingsboard", "filtration", "water_treatment", "fluid"],
        "ports": [
            {"id": "feed_in", "name": "Feed Water In", "x": 4, "y": 50, "direction": "LEFT", "type": "INLET"},
            {"id": "filtrate_out", "name": "Treated Water Out", "x": 116, "y": 50, "direction": "RIGHT", "type": "OUTLET"},
            {"id": "reject", "name": "Concentrate / Reject", "x": 60, "y": 101, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": tb_fluid_filtration_svg if tb_fluid_filtration_svg else '<svg viewBox="0 0 120 105" width="120" height="105"><rect width="120" height="105" fill="#0284c7"/></svg>'
    },

    # 11. THINGSBOARD FLUID REACTOR
    {
        "id": "sym-tb-fluid-reactor",
        "name": "ThingsBoard Fluid Chemical Reactor Vessel (Official Vector)",
        "category": "Tanks and Vessels",
        "subcategory": "Reactors",
        "description": "ThingsBoard official vector asset for fluid chemical treatment reactors and mixing vessels.",
        "version": "3.0.0",
        "default_width": 125,
        "default_height": 100,
        "tags": ["thingsboard", "reactor", "fluid", "chemical"],
        "ports": [
            {"id": "top_in", "name": "Reagent In", "x": 62, "y": 4, "direction": "TOP", "type": "INLET"},
            {"id": "left_in", "name": "Process In", "x": 4, "y": 50, "direction": "LEFT", "type": "INLET"},
            {"id": "bottom_out", "name": "Product Out", "x": 62, "y": 96, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": tb_fluid_svg if tb_fluid_svg else '<svg viewBox="0 0 125 100" width="125" height="100"><rect width="125" height="100" fill="#3b82f6"/></svg>'
    },

    # 12. THINGSBOARD TANK LEVEL MONITOR
    {
        "id": "sym-tb-tank-level-tx",
        "name": "ThingsBoard Guided Radar Tank Level Transmitter (Official Vector)",
        "category": "Instrumentation",
        "subcategory": "Level",
        "description": "ThingsBoard official vector asset for continuous level measurement and monitoring.",
        "version": "3.0.0",
        "default_width": 110,
        "default_height": 95,
        "tags": ["thingsboard", "level_transmitter", "radar", "instrumentation"],
        "ports": [
            {"id": "flange", "name": "Vessel Flange", "x": 55, "y": 91, "direction": "BOTTOM", "type": "INLET"},
            {"id": "signal", "name": "4-20mA HART", "x": 106, "y": 40, "direction": "RIGHT", "type": "SIGNAL"}
        ],
        "behaviors": [],
        "svg_content": tb_tank_level_svg if tb_tank_level_svg else '<svg viewBox="0 0 110 95" width="110" height="95"><circle cx="55" cy="45" r="30" fill="#06b6d4"/></svg>'
    },

    # 13. THINGSBOARD PUMP MANAGEMENT SKID
    {
        "id": "sym-tb-multi-pump-mgmt",
        "name": "ThingsBoard Multi-Pump Skid Management System (Official Vector)",
        "category": "Pumps",
        "subcategory": "Skids",
        "description": "ThingsBoard official vector asset for parallel pump skid control and telemetry management.",
        "version": "3.0.0",
        "default_width": 130,
        "default_height": 90,
        "tags": ["thingsboard", "pump_skid", "management", "control"],
        "ports": [
            {"id": "manifold_in", "name": "Suction Manifold", "x": 4, "y": 45, "direction": "LEFT", "type": "INLET"},
            {"id": "manifold_out", "name": "Discharge Manifold", "x": 126, "y": 45, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": tb_pump_mgmt_svg if tb_pump_mgmt_svg else '<svg viewBox="0 0 130 90" width="130" height="90"><rect width="130" height="90" fill="#1e293b"/></svg>'
    },

    # 14. THINGSBOARD FLOW REGULATION
    {
        "id": "sym-tb-flow-controller",
        "name": "ThingsBoard In-Line Flow Regulation Controller (Official Vector)",
        "category": "Instrumentation",
        "subcategory": "Flow",
        "description": "ThingsBoard official vector asset for in-line flow metering and regulation control.",
        "version": "3.0.0",
        "default_width": 100,
        "default_height": 80,
        "tags": ["thingsboard", "flow", "controller", "regulation"],
        "ports": [
            {"id": "flow_in", "name": "Inflow", "x": 4, "y": 40, "direction": "LEFT", "type": "INLET"},
            {"id": "flow_out", "name": "Outflow", "x": 96, "y": 40, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": tb_flow_svg if tb_flow_svg else '<svg viewBox="0 0 100 80" width="100" height="80"><rect width="100" height="80" fill="#0ea5e9"/></svg>'
    },

    # 15. INDUSTRIAL IOT SCADA GATEWAY
    {
        "id": "sym-iot-edge-gateway",
        "name": "Industrial DIN-Rail IoT SCADA Gateway & Protocol Controller",
        "category": "Electrical",
        "subcategory": "Controllers",
        "description": "Multi-protocol edge gateway with Modbus RTU/TCP, MQTT, dual cellular/Wi-Fi antennas, and status LEDs.",
        "version": "3.0.0",
        "default_width": 90,
        "default_height": 90,
        "tags": ["gateway", "iot", "modbus", "mqtt", "telemetry", "controller"],
        "ports": [
            {"id": "eth1", "name": "Ethernet LAN", "x": 4, "y": 70, "direction": "LEFT", "type": "SIGNAL"},
            {"id": "rs485", "name": "RS-485 Modbus", "x": 86, "y": 70, "direction": "RIGHT", "type": "SIGNAL"},
            {"id": "power", "name": "24V DC Power", "x": 45, "y": 86, "direction": "BOTTOM", "type": "ELECTRICAL"}
        ],
        "behaviors": [
            {"type": "blink", "target": "run_led", "trigger": "active", "speed": 1.0}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" width="90" height="90">
  <rect x="18" y="15" width="54" height="68" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
  <rect x="23" y="20" width="44" height="20" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1"/>
  <text x="45" y="33" fill="#38bdf8" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">EDGE-GW</text>
  <!-- Antennas -->
  <line x1="26" y1="15" x2="26" y2="4" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
  <circle cx="26" cy="3" r="1.5" fill="#38bdf8"/>
  <line x1="64" y1="15" x2="64" y2="4" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
  <circle cx="64" cy="3" r="1.5" fill="#38bdf8"/>
  <!-- Status LEDs -->
  <circle id="run_led" cx="28" cy="48" r="2.5" fill="#22c55e" stroke="#14532d" stroke-width="0.8"/>
  <text x="35" y="50" fill="#94a3b8" font-size="6" font-family="monospace">PWR</text>
  <circle cx="28" cy="58" r="2.5" fill="#38bdf8" stroke="#0369a1" stroke-width="0.8"/>
  <text x="35" y="60" fill="#94a3b8" font-size="6" font-family="monospace">COM</text>
  <circle cx="58" cy="48" r="2.5" fill="#f59e0b" stroke="#78350f" stroke-width="0.8"/>
  <text x="65" y="50" fill="#94a3b8" font-size="6" font-family="monospace">ALM</text>
  <!-- Ethernet Jack -->
  <rect x="36" y="68" width="18" height="12" rx="2" fill="#334155" stroke="#475569" stroke-width="1"/>
</svg>"""
    },

    # 16. PLATE HEAT EXCHANGER
    {
        "id": "sym-plate-heat-exchanger",
        "name": "Industrial Plate & Frame Heat Exchanger",
        "category": "Thermal Equipment",
        "subcategory": "Exchangers",
        "description": "Corrugated stainless steel plate pack heat exchanger with heavy carbon steel compression frames.",
        "version": "3.0.0",
        "default_width": 85,
        "default_height": 110,
        "tags": ["heat_exchanger", "plate_frame", "thermal", "hvac"],
        "ports": [
            {"id": "hot_in", "name": "Hot Side In", "x": 4, "y": 25, "direction": "LEFT", "type": "INLET"},
            {"id": "hot_out", "name": "Hot Side Out", "x": 4, "y": 85, "direction": "LEFT", "type": "OUTLET"},
            {"id": "cold_in", "name": "Cold Side In", "x": 81, "y": 85, "direction": "RIGHT", "type": "INLET"},
            {"id": "cold_out", "name": "Cold Side Out", "x": 81, "y": 25, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 110" width="85" height="110">
  <!-- Fixed and Movable Frame Covers -->
  <rect x="18" y="10" width="10" height="90" rx="2" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
  <rect x="57" y="10" width="10" height="90" rx="2" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
  <!-- Top and Bottom Guide Bars -->
  <rect x="14" y="6" width="57" height="6" fill="#64748b" stroke="#334155" stroke-width="1"/>
  <rect x="14" y="98" width="57" height="6" fill="#64748b" stroke="#334155" stroke-width="1"/>
  <!-- Plate Pack Ribs -->
  <g stroke="#94a3b8" stroke-width="1.5">
    <line x1="31" y1="14" x2="31" y2="96"/>
    <line x1="35" y1="14" x2="35" y2="96"/>
    <line x1="39" y1="14" x2="39" y2="96"/>
    <line x1="43" y1="14" x2="43" y2="96"/>
    <line x1="47" y1="14" x2="47" y2="96"/>
    <line x1="51" y1="14" x2="51" y2="96"/>
    <line x1="55" y1="14" x2="55" y2="96"/>
  </g>
  <!-- Nozzles -->
  <rect x="2" y="20" width="16" height="10" rx="2" fill="#ef4444" stroke="#991b1b" stroke-width="1.2"/>
  <rect x="2" y="80" width="16" height="10" rx="2" fill="#dc2626" stroke="#991b1b" stroke-width="1.2"/>
  <rect x="67" y="80" width="16" height="10" rx="2" fill="#38bdf8" stroke="#0284c7" stroke-width="1.2"/>
  <rect x="67" y="20" width="16" height="10" rx="2" fill="#0ea5e9" stroke="#0284c7" stroke-width="1.2"/>
</svg>"""
    },

    # 17. COOLING TOWER
    {
        "id": "sym-cooling-tower-ind",
        "name": "Industrial Induced-Draft Cooling Tower",
        "category": "Thermal Equipment",
        "subcategory": "Cooling Towers",
        "description": "Counterflow cooling tower with top induced-draft fan, drift eliminators, and basin.",
        "version": "3.0.0",
        "default_width": 120,
        "default_height": 130,
        "tags": ["cooling_tower", "thermal", "hvac", "heat_rejection"],
        "ports": [
            {"id": "water_in", "name": "Hot Water In", "x": 4, "y": 45, "direction": "LEFT", "type": "INLET"},
            {"id": "cold_out", "name": "Cold Water Out", "x": 116, "y": 115, "direction": "RIGHT", "type": "OUTLET"},
            {"id": "overflow", "name": "Basin Drain", "x": 60, "y": 126, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "rotation", "target": "tower_fan", "trigger": "running", "speed": 1.8}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130" width="120" height="130">
  <!-- Outer Casing -->
  <polygon points="25,35 95,35 105,105 15,105" fill="#1e293b" stroke="#475569" stroke-width="2"/>
  <!-- Cold Water Basin -->
  <rect x="10" y="105" width="100" height="18" rx="3" fill="#0369a1" stroke="#0284c7" stroke-width="2"/>
  <!-- Louvers Grid -->
  <g stroke="#334155" stroke-width="1.5">
    <line x1="22" y1="50" x2="98" y2="50"/>
    <line x1="20" y1="65" x2="100" y2="65"/>
    <line x1="18" y1="80" x2="102" y2="80"/>
    <line x1="16" y1="95" x2="104" y2="95"/>
  </g>
  <!-- Fan Shroud Cowl -->
  <polygon points="35,35 85,35 80,12 40,12" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
  <!-- Fan Hub & Blades -->
  <g id="tower_fan" transform-origin="60 22">
    <circle cx="60" cy="22" r="5" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="42" y1="22" x2="78" y2="22" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>"""
    },

    # 18. ROTARY SCREW AIR COMPRESSOR
    {
        "id": "sym-rotary-screw-compressor",
        "name": "Industrial Rotary Screw Air Compressor Skid",
        "category": "Rotating Equipment",
        "subcategory": "Compressors",
        "description": "Enclosed stationary rotary screw air compressor with sound cabinet and control screen.",
        "version": "3.0.0",
        "default_width": 130,
        "default_height": 95,
        "tags": ["compressor", "air", "pneumatics", "screw_compressor"],
        "ports": [
            {"id": "air_out", "name": "Compressed Air Out", "x": 126, "y": 30, "direction": "RIGHT", "type": "OUTLET"},
            {"id": "condensate", "name": "Auto Drain", "x": 65, "y": 91, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 95" width="130" height="95">
  <rect x="6" y="8" width="118" height="78" rx="6" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
  <rect x="12" y="14" width="35" height="40" rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Air Intake Louvers -->
  <g stroke="#e0f2fe" stroke-width="1.5">
    <line x1="16" y1="22" x2="42" y2="22"/>
    <line x1="16" y1="28" x2="42" y2="28"/>
    <line x1="16" y1="34" x2="42" y2="34"/>
    <line x1="16" y1="40" x2="42" y2="40"/>
    <line x1="16" y1="46" x2="42" y2="46"/>
  </g>
  <!-- HMI Display Screen -->
  <rect x="70" y="20" width="40" height="25" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="90" y="36" fill="#38bdf8" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle">7.8 bar</text>
  <!-- Power Button -->
  <circle cx="90" cy="62" r="6" fill="#22c55e" stroke="#14532d" stroke-width="1.5"/>
</svg>"""
    },

    # 19. VERTICAL MULTI-STAGE BOOSTER PUMP
    {
        "id": "sym-multistage-vertical-pump",
        "name": "Vertical Multi-Stage High-Pressure Booster Pump",
        "category": "Pumps",
        "subcategory": "Multi-Stage",
        "description": "High-pressure in-line multi-stage centrifugal pump for reverse osmosis and pressure boosting.",
        "version": "3.0.0",
        "default_width": 65,
        "default_height": 135,
        "tags": ["pump", "multistage", "vertical", "booster", "high_pressure"],
        "ports": [
            {"id": "suction", "name": "In-line Suction", "x": 4, "y": 115, "direction": "LEFT", "type": "INLET"},
            {"id": "discharge", "name": "In-line Discharge", "x": 61, "y": 115, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 135" width="65" height="135">
  <!-- Base Flanges -->
  <rect x="4" y="108" width="14" height="14" fill="#334155" stroke="#64748b" stroke-width="1"/>
  <rect x="47" y="108" width="14" height="14" fill="#334155" stroke="#64748b" stroke-width="1"/>
  <!-- Pump Chamber Barrel -->
  <rect x="18" y="52" width="29" height="68" rx="2" fill="#0284c7" stroke="#0369a1" stroke-width="1.8"/>
  <!-- Stage Indicator Rings -->
  <g stroke="#38bdf8" stroke-width="1.2">
    <line x1="18" y1="65" x2="47" y2="65"/>
    <line x1="18" y1="78" x2="47" y2="78"/>
    <line x1="18" y1="91" x2="47" y2="91"/>
    <line x1="18" y1="104" x2="47" y2="104"/>
  </g>
  <!-- Coupling Housing -->
  <rect x="22" y="40" width="21" height="12" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
  <!-- TEFC Electric Motor -->
  <rect x="15" y="8" width="35" height="32" rx="4" fill="#15803d" stroke="#166534" stroke-width="1.5"/>
  <g stroke="#166534" stroke-width="1.2">
    <line x1="20" y1="10" x2="20" y2="38"/>
    <line x1="26" y1="10" x2="26" y2="38"/>
    <line x1="32" y1="10" x2="32" y2="38"/>
    <line x1="38" y1="10" x2="38" y2="38"/>
    <line x1="44" y1="10" x2="44" y2="38"/>
  </g>
</svg>"""
    },

    # 20. CHEMICAL DOSING SKID
    {
        "id": "sym-chemical-dosing-skid",
        "name": "Dual-Head Automatic Chemical Dosing & Metering Skid",
        "category": "Water Treatment & Pool",
        "subcategory": "Dosing",
        "description": "Automated chemical dosing skid for pH correction and chlorine disinfection with calibration cylinders.",
        "version": "3.0.0",
        "default_width": 115,
        "default_height": 110,
        "tags": ["dosing", "chemical", "ph", "chlorine", "metering_pump"],
        "ports": [
            {"id": "reagent_in", "name": "Reagent Tank Suction", "x": 20, "y": 105, "direction": "BOTTOM", "type": "INLET"},
            {"id": "injection_out", "name": "Quill Injection Line", "x": 110, "y": 25, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 115 110" width="115" height="110">
  <!-- Mounting Backboard -->
  <rect x="6" y="8" width="103" height="94" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1.8"/>
  <!-- Dosing Pump 1 (pH) -->
  <rect x="15" y="16" width="38" height="42" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="34" y="32" fill="#f59e0b" font-size="7" font-weight="bold" font-family="monospace" text-anchor="middle">pH PUMP</text>
  <circle cx="34" cy="44" r="5" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="1"/>
  <!-- Dosing Pump 2 (Chlorine) -->
  <rect x="62" y="16" width="38" height="42" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="81" y="32" fill="#38bdf8" font-size="7" font-weight="bold" font-family="monospace" text-anchor="middle">Cl PUMP</text>
  <circle cx="81" cy="44" r="5" fill="#38bdf8" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1"/>
  <!-- Clear Calibration Tube -->
  <rect x="48" y="66" width="18" height="30" rx="3" fill="#0284c7" fill-opacity="0.3" stroke="#64748b" stroke-width="1.2"/>
  <line x1="52" y1="72" x2="62" y2="72" stroke="#fff" stroke-width="0.8"/>
  <line x1="52" y1="78" x2="62" y2="78" stroke="#fff" stroke-width="0.8"/>
  <line x1="52" y1="84" x2="62" y2="84" stroke="#fff" stroke-width="0.8"/>
  <line x1="52" y1="90" x2="62" y2="90" stroke="#fff" stroke-width="0.8"/>
</svg>"""
    }
]

# Update scada_symbol_catalog.py and scada_store_state.json
import app.services.scada_symbol_catalog as cat_module

existing_ids = {s['id'] for s in cat_module.INDUSTRIAL_SYMBOL_CATALOG}
added = 0
updated = 0

for sym in NEW_MACHINERY_SYMBOLS:
    if sym['id'] in existing_ids:
        # replace
        for i, s in enumerate(cat_module.INDUSTRIAL_SYMBOL_CATALOG):
            if s['id'] == sym['id']:
                cat_module.INDUSTRIAL_SYMBOL_CATALOG[i] = sym
                updated += 1
                break
    else:
        cat_module.INDUSTRIAL_SYMBOL_CATALOG.append(sym)
        existing_ids.add(sym['id'])
        added += 1

print(f"In-memory updated: {updated}, added: {added}. Total catalog: {len(cat_module.INDUSTRIAL_SYMBOL_CATALOG)}")

# Also update scada_store_state.json
store_file = "backend/scada_store_state.json"
if os.path.exists(store_file):
    with open(store_file, "r", encoding="utf-8") as f:
        store = json.load(f)
    
    symbols_list = store.get("symbols", [])
    symbols_map = {s["id"]: s for s in symbols_list}
    for sym in NEW_MACHINERY_SYMBOLS:
        symbols_map[sym["id"]] = sym
    store["symbols"] = list(symbols_map.values())
    
    with open(store_file, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2)
    print(f"Updated {store_file} successfully! Total symbols in JSON: {len(store['symbols'])}")
