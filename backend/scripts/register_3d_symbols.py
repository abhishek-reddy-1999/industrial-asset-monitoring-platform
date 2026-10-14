import json

with open('backend/scada_store_state.json', 'r', encoding='utf-8') as f:
    state = json.load(f)

# Define all 3D symbols
symbols_to_add = [
    {
        'id': 'sym-3d-pool-pump',
        'name': '3D Pool Circulation Pump (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'Pumps',
        'description': 'High-resolution 3D commercial pool circulation pump with cooling fins and volute casing.',
        'version': '3.1.0',
        'default_width': 140,
        'default_height': 95,
        'tags': ['3d', 'pump', 'pool', 'circulation', 'thingsboard'],
        'ports': [
            {'id': 'suction', 'name': 'Suction Flange', 'x': 0, 'y': 48, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'discharge', 'name': 'Discharge Flange', 'x': 36, 'y': 0, 'direction': 'TOP', 'type': 'OUTLET'},
            {'id': 'drain', 'name': 'Drain Plug', 'x': 130, 'y': 95, 'direction': 'BOTTOM', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 95" width="140" height="95"><image href="/assets/scada/symbols_3d/water_pump_3d.png" x="0" y="0" width="140" height="95" preserveAspectRatio="xMidYMid meet" /><circle cx="128" cy="18" r="3.5" fill="#22c55e" stroke="#0f172a" stroke-width="1.2"/></svg>'
    },
    {
        'id': 'sym-3d-sand-filter',
        'name': '3D Sand Filter SF-201 (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'Filtration',
        'description': 'High-resolution 3D commercial fiberglass sand filter vessel with multiport valve head.',
        'version': '3.1.0',
        'default_width': 120,
        'default_height': 150,
        'tags': ['3d', 'filter', 'sand_filter', 'filtration', 'thingsboard'],
        'ports': [
            {'id': 'inlet', 'name': 'Inlet Port', 'x': 0, 'y': 32, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'outlet', 'name': 'Filtered Outlet', 'x': 120, 'y': 32, 'direction': 'RIGHT', 'type': 'OUTLET'},
            {'id': 'waste', 'name': 'Backwash Waste', 'x': 105, 'y': 62, 'direction': 'RIGHT', 'type': 'OUTLET'},
            {'id': 'drain', 'name': 'Bottom Drain', 'x': 60, 'y': 150, 'direction': 'BOTTOM', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150"><image href="/assets/scada/symbols_3d/sand_filter_3d.png" x="0" y="0" width="120" height="150" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-heat-pump',
        'name': '3D Inverter Heat Pump HP-301 (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'Heating',
        'description': 'High-resolution 3D commercial inverter pool heat pump with axial fan grill and LED display.',
        'version': '3.1.0',
        'default_width': 160,
        'default_height': 120,
        'tags': ['3d', 'heat_pump', 'chiller', 'heater', 'thingsboard'],
        'ports': [
            {'id': 'water_in', 'name': 'Water Inlet', 'x': 0, 'y': 35, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'water_out', 'name': 'Water Outlet', 'x': 0, 'y': 85, 'direction': 'LEFT', 'type': 'OUTLET'},
            {'id': 'power', 'name': 'Power Connection', 'x': 160, 'y': 100, 'direction': 'RIGHT', 'type': 'ELECTRICAL'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="160" height="120"><image href="/assets/scada/symbols_3d/heat_pump_3d.png" x="0" y="0" width="160" height="120" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-pool-basin',
        'name': '3D Commercial Swimming Pool Basin (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'Basin',
        'description': 'High-resolution 3D swimming pool basin cutaway with clear blue water and perimeter coping.',
        'version': '3.1.0',
        'default_width': 640,
        'default_height': 200,
        'tags': ['3d', 'pool', 'basin', 'tank', 'thingsboard'],
        'ports': [
            {'id': 'skimmer', 'name': 'Skimmer Outlet', 'x': 0, 'y': 60, 'direction': 'LEFT', 'type': 'OUTLET'},
            {'id': 'bottom', 'name': 'Bottom Drain', 'x': 120, 'y': 200, 'direction': 'BOTTOM', 'type': 'OUTLET'},
            {'id': 'return_jets', 'name': 'Return Jets Inlet', 'x': 640, 'y': 60, 'direction': 'RIGHT', 'type': 'INLET'},
            {'id': 'level_sensor', 'name': 'Water Level Port', 'x': 0, 'y': 120, 'direction': 'LEFT', 'type': 'INSTRUMENT'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 200" width="640" height="200"><image href="/assets/scada/symbols_3d/pool_basin_3d.png" x="0" y="0" width="640" height="200" preserveAspectRatio="none" /></svg>'
    },
    {
        'id': 'sym-3d-valve-vert',
        'name': '3D Inline Valve Vertical (ThingsBoard Green)',
        'category': '3D Equipment',
        'subcategory': 'Valves',
        'description': 'High-resolution 3D inline process isolation valve in vertical pipe orientation.',
        'version': '3.1.0',
        'default_width': 36,
        'default_height': 72,
        'tags': ['3d', 'valve', 'isolation', 'thingsboard'],
        'ports': [
            {'id': 'top', 'name': 'Top Flange', 'x': 18, 'y': 0, 'direction': 'TOP', 'type': 'INLET'},
            {'id': 'bottom', 'name': 'Bottom Flange', 'x': 18, 'y': 72, 'direction': 'BOTTOM', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 72" width="36" height="72"><image href="/assets/scada/symbols_3d/valve_inline_green_vert_3d.png" x="0" y="0" width="36" height="72" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-valve-horiz',
        'name': '3D Inline Valve Horizontal (ThingsBoard Green)',
        'category': '3D Equipment',
        'subcategory': 'Valves',
        'description': 'High-resolution 3D inline process isolation valve in horizontal pipe orientation.',
        'version': '3.1.0',
        'default_width': 72,
        'default_height': 36,
        'tags': ['3d', 'valve', 'isolation', 'thingsboard'],
        'ports': [
            {'id': 'left', 'name': 'Left Flange', 'x': 0, 'y': 18, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'right', 'name': 'Right Flange', 'x': 72, 'y': 18, 'direction': 'RIGHT', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 36" width="72" height="36"><image href="/assets/scada/symbols_3d/valve_inline_green_horiz_3d.png" x="0" y="0" width="72" height="36" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-valve-bypass',
        'name': '3D Bypass Block Valve (ThingsBoard Closed Black)',
        'category': '3D Equipment',
        'subcategory': 'Valves',
        'description': 'High-resolution 3D heater bypass block valve in normally-closed state.',
        'version': '3.1.0',
        'default_width': 72,
        'default_height': 36,
        'tags': ['3d', 'valve', 'bypass', 'thingsboard'],
        'ports': [
            {'id': 'left', 'name': 'Left Flange', 'x': 0, 'y': 18, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'right', 'name': 'Right Flange', 'x': 72, 'y': 18, 'direction': 'RIGHT', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 36" width="72" height="36"><image href="/assets/scada/symbols_3d/valve_closed_black_3d.png" x="0" y="0" width="72" height="36" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-spoke-valve',
        'name': '3D Spoke Handwheel Valve (ThingsBoard Valve 9)',
        'category': '3D Equipment',
        'subcategory': 'Valves',
        'description': 'High-resolution 3D industrial spoke handwheel gate valve with center power status button.',
        'version': '3.1.0',
        'default_width': 100,
        'default_height': 48,
        'tags': ['3d', 'valve', 'spoke', 'gate_valve', 'thingsboard'],
        'ports': [
            {'id': 'inlet', 'name': 'Inlet Flange', 'x': 0, 'y': 24, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'outlet', 'name': 'Outlet Flange', 'x': 100, 'y': 24, 'direction': 'RIGHT', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 48" width="100" height="48\"><image href="/assets/scada/symbols_3d/spoke_gate_valve_3d.png" x="0" y="0" width="100" height="48" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-lint-strainer',
        'name': '3D Hair & Lint Pre-Strainer (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'Filtration',
        'description': 'High-resolution 3D pre-filter strainer canister trap before circulation pump.',
        'version': '3.1.0',
        'default_width': 50,
        'default_height': 85,
        'tags': ['3d', 'strainer', 'pre_filter', 'thingsboard'],
        'ports': [
            {'id': 'inlet', 'name': 'Inlet Port', 'x': 0, 'y': 28, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'outlet', 'name': 'Outlet Port', 'x': 50, 'y': 28, 'direction': 'RIGHT', 'type': 'OUTLET'},
            {'id': 'drain', 'name': 'Drain Plug', 'x': 25, 'y': 85, 'direction': 'BOTTOM', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 85" width="50" height="85"><image href="/assets/scada/symbols_3d/hair_lint_strainer_3d.png" x="0" y="0" width="50" height="85" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-flow-meter',
        'name': '3D Digital Flow Meter (ThingsBoard FT-101)',
        'category': '3D Equipment',
        'subcategory': 'Instrumentation',
        'description': 'High-resolution 3D digital electromagnetic flow transmitter meter with green bezel.',
        'version': '3.1.0',
        'default_width': 58,
        'default_height': 58,
        'tags': ['3d', 'flowmeter', 'transmitter', 'thingsboard'],
        'ports': [
            {'id': 'inlet', 'name': 'Inlet Flange', 'x': 0, 'y': 29, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'outlet', 'name': 'Outlet Flange', 'x': 58, 'y': 29, 'direction': 'RIGHT', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58 58" width="58" height="58"><image href="/assets/scada/symbols_3d/flow_meter_3d.png" x="0" y="0" width="58" height="58" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-ph-canister',
        'name': '3D pH & Chlorine Dosing Cell (ThingsBoard CH-401)',
        'category': '3D Equipment',
        'subcategory': 'Instrumentation',
        'description': 'High-resolution 3D pH electrode sensor and chemical dosing injection canister.',
        'version': '3.1.0',
        'default_width': 50,
        'default_height': 85,
        'tags': ['3d', 'ph', 'chemical', 'dosing', 'thingsboard'],
        'ports': [
            {'id': 'inlet', 'name': 'Inlet Port', 'x': 0, 'y': 28, 'direction': 'LEFT', 'type': 'INLET'},
            {'id': 'outlet', 'name': 'Outlet Port', 'x': 50, 'y': 28, 'direction': 'RIGHT', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 85" width="50" height="85"><image href="/assets/scada/symbols_3d/ph_dosing_cell_3d.png" x="0" y="0" width="50" height="85" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-water-level-dial',
        'name': '3D Water Level Dial Gauge (ThingsBoard 1/2 Full)',
        'category': '3D Equipment',
        'subcategory': 'Instrumentation',
        'description': 'High-resolution 3D analog circular pool water level gauge dial indicator.',
        'version': '3.1.0',
        'default_width': 65,
        'default_height': 65,
        'tags': ['3d', 'level', 'gauge', 'dial', 'thingsboard'],
        'ports': [
            {'id': 'mount', 'name': 'Mount Flange', 'x': 65, 'y': 32, 'direction': 'RIGHT', 'type': 'INSTRUMENT'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65" width="65" height="65"><image href="/assets/scada/symbols_3d/water_level_dial_3d.png" x="0" y="0" width="65" height="65" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-water-drain-splash',
        'name': '3D Water Drain Backwash Splash (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'Piping',
        'description': 'High-resolution 3D drain pipe elbow with blue backwash water discharge splash.',
        'version': '3.1.0',
        'default_width': 60,
        'default_height': 75,
        'tags': ['3d', 'drain', 'splash', 'waste', 'thingsboard'],
        'ports': [
            {'id': 'inlet', 'name': 'Drain Pipe Inlet', 'x': 0, 'y': 20, 'direction': 'LEFT', 'type': 'INLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 75" width="60" height="75"><image href="/assets/scada/symbols_3d/water_drain_splash_3d.png" x="0" y="0" width="60" height="75" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-water-supply-badge',
        'name': '3D Water Supply Terminal Header Badge (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'HMI Elements',
        'description': 'High-resolution 3D fresh city water supply inlet pipe terminal label badge.',
        'version': '3.1.0',
        'default_width': 95,
        'default_height': 34,
        'tags': ['3d', 'badge', 'supply', 'thingsboard'],
        'ports': [
            {'id': 'outlet', 'name': 'Supply Pipe Outlet', 'x': 95, 'y': 17, 'direction': 'RIGHT', 'type': 'OUTLET'}
        ],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 95 34" width="95" height="34"><image href="/assets/scada/symbols_3d/water_supply_badge_3d.png" x="0" y="0" width="95" height="34" preserveAspectRatio="xMidYMid meet" /></svg>'
    },
    {
        'id': 'sym-3d-capacity-badge',
        'name': '3D Pool Capacity Badge 55000 L (ThingsBoard)',
        'category': '3D Equipment',
        'subcategory': 'HMI Elements',
        'description': 'High-resolution 3D swimming pool capacity metric badge card.',
        'version': '3.1.0',
        'default_width': 120,
        'default_height': 42,
        'tags': ['3d', 'badge', 'volume', 'thingsboard'],
        'ports': [],
        'svg_content': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 42" width="120" height="42"><image href="/assets/scada/symbols_3d/pool_capacity_badge_3d.png" x="0" y="0" width="120" height="42" preserveAspectRatio="xMidYMid meet" /></svg>'
    }
]

existing_sym_ids = {s['id']: i for i, s in enumerate(state['symbols'])}
for s in symbols_to_add:
    if s['id'] in existing_sym_ids:
        state['symbols'][existing_sym_ids[s['id']]] = s
    else:
        state['symbols'].append(s)

with open('backend/scada_store_state.json', 'w', encoding='utf-8') as f:
    json.dump(state, f, indent=2, ensure_ascii=False)

print(f'Successfully updated symbol catalog! Total symbols: {len(state["symbols"])}')
