"""
scada_template_catalog.py - Reusable Industrial Process Systems and Assembly Templates
Provides ready-to-configure equipment assemblies and process scenes:
1. Single Pump Transfer Skid
2. Duty / Standby Duplex Pump Assembly
3. Shell & Tube Heat Exchanger Cooling Loop
4. Utility Boiler & Steam Distribution Header
5. Industrial Chiller & Cooling Tower Circuit
6. Multi-Tank Chemical Storage Farm
7. Centrifugal Gas Compressor Train with Knockout Drum & Intercooler
8. Automated Motor / VFD Speed Control System
9. Bulk Material Belt Conveyor Handling Assembly
10. Water Treatment RO (Reverse Osmosis) Filtration Unit
"""
from typing import List, Dict, Any

PROCESS_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "tpl-single-pump-skid",
        "name": "Single Pump Transfer Skid",
        "category": "Fluid Transfer",
        "description": "Feed tank with suction isolation valve, strainer, centrifugal pump, check valve, and discharge control valve.",
        "width": 1200,
        "height": 700,
        "expected_asset_roles": [
            {"role": "feed_tank", "label": "Supply Tank", "type": "TANK", "suggested_tags": ["T_101.LEVEL", "T_101.TEMP"]},
            {"role": "transfer_pump", "label": "Transfer Pump", "type": "PUMP", "suggested_tags": ["P_101.RUNNING", "P_101.DISCH_PRESS", "P_101.VIBRATION"]},
            {"role": "flow_control_valve", "label": "Flow Control Valve", "type": "VALVE", "suggested_tags": ["FCV_101.POSITION", "FCV_101.FLOW"]}
        ],
        "elements": [
            {
                "instance_id": "elem-feed-tank",
                "symbol_id": "sym-tank-vert-dished",
                "label": "Feed Tank T-101",
                "x": 80,
                "y": 140,
                "width": 120,
                "height": 180,
                "rotation": 0,
                "bindings": {
                    "level_pct": {"tag_name": "T_101.LEVEL", "data_type": "Float"}
                }
            },
            {
                "instance_id": "elem-suction-valve",
                "symbol_id": "sym-valve-gate-manual",
                "label": "Suction Valve HV-101",
                "x": 260,
                "y": 250,
                "width": 60,
                "height": 60,
                "rotation": 0,
                "bindings": {}
            },
            {
                "instance_id": "elem-pump",
                "symbol_id": "sym-pump-centrif-horiz",
                "label": "Transfer Pump P-101",
                "x": 380,
                "y": 240,
                "width": 80,
                "height": 80,
                "rotation": 0,
                "bindings": {
                    "running": {"tag_name": "P_101.RUNNING", "data_type": "Boolean"},
                    "casingColor": {"tag_name": "P_101.STATUS_COLOR", "data_type": "String"}
                }
            },
            {
                "instance_id": "elem-check-valve",
                "symbol_id": "sym-valve-check",
                "label": "Check Valve NGV-101",
                "x": 520,
                "y": 250,
                "width": 60,
                "height": 50,
                "rotation": 0,
                "bindings": {}
            },
            {
                "instance_id": "elem-ctrl-valve",
                "symbol_id": "sym-valve-ctrl-pneumatic",
                "label": "Control Valve FCV-101",
                "x": 640,
                "y": 235,
                "width": 65,
                "height": 80,
                "rotation": 0,
                "bindings": {
                    "state_color": {"tag_name": "FCV_101.POSITION", "data_type": "Float"}
                }
            },
            {
                "instance_id": "elem-flow-gauge",
                "symbol_id": "sym-inst-ft",
                "label": "FIT-101",
                "x": 770,
                "y": 180,
                "width": 50,
                "height": 60,
                "rotation": 0,
                "bindings": {
                    "tag_name": {"tag_name": "FIT_101.PV", "data_type": "Float"}
                }
            },
            {
                "instance_id": "elem-readout-flow",
                "symbol_id": "sym-hmi-digital-readout",
                "label": "Discharge Flow",
                "x": 750,
                "y": 110,
                "width": 90,
                "height": 40,
                "rotation": 0,
                "bindings": {
                    "value": {"tag_name": "FIT_101.PV", "data_type": "Float"}
                }
            }
        ],
        "connections": [
            {
                "id": "pipe-tank-to-valve",
                "from_element": "elem-feed-tank",
                "from_port": "side_nozzle",
                "to_element": "elem-suction-valve",
                "to_port": "inlet",
                "line_type": "PROCESS_LINE",
                "stroke": "#38bdf8",
                "stroke_width": 3,
                "flow_animated": True
            },
            {
                "id": "pipe-valve-to-pump",
                "from_element": "elem-suction-valve",
                "from_port": "outlet",
                "to_element": "elem-pump",
                "to_port": "suction",
                "line_type": "PROCESS_LINE",
                "stroke": "#38bdf8",
                "stroke_width": 3,
                "flow_animated": True
            },
            {
                "id": "pipe-pump-to-check",
                "from_element": "elem-pump",
                "from_port": "discharge",
                "to_element": "elem-check-valve",
                "to_port": "inlet",
                "line_type": "PROCESS_LINE",
                "stroke": "#38bdf8",
                "stroke_width": 3,
                "flow_animated": True
            },
            {
                "id": "pipe-check-to-ctrl",
                "from_element": "elem-check-valve",
                "from_port": "outlet",
                "to_element": "elem-ctrl-valve",
                "to_port": "inlet",
                "line_type": "PROCESS_LINE",
                "stroke": "#38bdf8",
                "stroke_width": 3,
                "flow_animated": True
            }
        ]
    },
    {
        "id": "tpl-duty-standby-pumps",
        "name": "Duty / Standby Duplex Pump Assembly",
        "category": "Fluid Transfer",
        "description": "A/B parallel pump skid with auto-changeover logic and isolated check/gate valves.",
        "width": 1200,
        "height": 800,
        "expected_asset_roles": [
            {"role": "pump_a", "label": "Lead Pump P-101A", "type": "PUMP", "suggested_tags": ["P_101A.RUNNING", "P_101A.DIFF_PRESS"]},
            {"role": "pump_b", "label": "Lag Pump P-101B", "type": "PUMP", "suggested_tags": ["P_101B.RUNNING", "P_101B.DIFF_PRESS"]}
        ],
        "elements": [
            {
                "instance_id": "elem-duplex-skid",
                "symbol_id": "sym-pump-skid-duplex",
                "label": "Duplex Pumping Skid P-101A/B",
                "x": 300,
                "y": 200,
                "width": 200,
                "height": 160,
                "rotation": 0,
                "bindings": {
                    "pump_a_running": {"tag_name": "P_101A.RUNNING", "data_type": "Boolean"},
                    "pump_b_running": {"tag_name": "P_101B.RUNNING", "data_type": "Boolean"}
                }
            },
            {
                "instance_id": "elem-status-a",
                "symbol_id": "sym-hmi-beacon-indicator",
                "label": "Pump A Status",
                "x": 550,
                "y": 210,
                "width": 40,
                "height": 40,
                "rotation": 0,
                "bindings": {
                    "state_color": {"tag_name": "P_101A.STATUS_COLOR", "data_type": "String"}
                }
            },
            {
                "instance_id": "elem-status-b",
                "symbol_id": "sym-hmi-beacon-indicator",
                "label": "Pump B Status",
                "x": 550,
                "y": 300,
                "width": 40,
                "height": 40,
                "rotation": 0,
                "bindings": {
                    "state_color": {"tag_name": "P_101B.STATUS_COLOR", "data_type": "String"}
                }
            }
        ],
        "connections": []
    },
    {
        "id": "tpl-heat-exchanger-loop",
        "name": "Shell & Tube Heat Exchanger Loop",
        "category": "Thermal Systems",
        "description": "Counter-current process fluid cooler with cooling water supply/return valves and temperature indicators.",
        "width": 1200,
        "height": 750,
        "expected_asset_roles": [
            {"role": "exchanger", "label": "Heat Exchanger E-101", "type": "HEAT_EXCHANGER", "suggested_tags": ["E_101.DUTY", "E_101.EFFICIENCY"]},
            {"role": "temp_sensor_hot_in", "label": "Process Inlet Temp", "type": "SENSOR", "suggested_tags": ["TIT_101.PV"]},
            {"role": "temp_sensor_cold_out", "label": "Process Outlet Temp", "type": "SENSOR", "suggested_tags": ["TIT_102.PV"]}
        ],
        "elements": [
            {
                "instance_id": "elem-hex",
                "symbol_id": "sym-he-shell-and-tube",
                "label": "Process Cooler E-101",
                "x": 380,
                "y": 250,
                "width": 160,
                "height": 90,
                "rotation": 0,
                "bindings": {}
            },
            {
                "instance_id": "elem-cw-valve",
                "symbol_id": "sym-valve-ctrl-pneumatic",
                "label": "TCV-101 (Cooling Water)",
                "x": 240,
                "y": 140,
                "width": 60,
                "height": 70,
                "rotation": 0,
                "bindings": {
                    "state_color": {"tag_name": "TCV_101.POSITION", "data_type": "Float"}
                }
            },
            {
                "instance_id": "elem-temp-in",
                "symbol_id": "sym-inst-tt",
                "label": "TIT-101 Hot In",
                "x": 160,
                "y": 270,
                "width": 50,
                "height": 60,
                "rotation": 0,
                "bindings": {
                    "tag_name": {"tag_name": "TIT_101.PV", "data_type": "Float"}
                }
            },
            {
                "instance_id": "elem-temp-out",
                "symbol_id": "sym-inst-tt",
                "label": "TIT-102 Cold Out",
                "x": 600,
                "y": 270,
                "width": 50,
                "height": 60,
                "rotation": 0,
                "bindings": {
                    "tag_name": {"tag_name": "TIT_102.PV", "data_type": "Float"}
                }
            }
        ],
        "connections": []
    },
    {
        "id": "tpl-boiler-steam-header",
        "name": "Utility Boiler & Steam Distribution Header",
        "category": "Steam Generation",
        "description": "High-pressure steam boiler with burner management, deaerator BFW supply, and main steam PRV header.",
        "width": 1300,
        "height": 850,
        "expected_asset_roles": [
            {"role": "boiler", "label": "Boiler B-101", "type": "BOILER", "suggested_tags": ["B_101.STEAM_FLOW", "B_101.DRUM_LEVEL", "B_101.FURNACE_PRESS"]},
            {"role": "steam_header", "label": "Steam Header HP-101", "type": "HEADER", "suggested_tags": ["PIC_101.PV"]}
        ],
        "elements": [
            {
                "instance_id": "elem-boiler",
                "symbol_id": "sym-boiler-watertube",
                "label": "Steam Boiler B-101",
                "x": 200,
                "y": 220,
                "width": 150,
                "height": 165,
                "rotation": 0,
                "bindings": {
                    "firing": {"tag_name": "B_101.BURNER_ACTIVE", "data_type": "Boolean"},
                    "flame_color": {"tag_name": "B_101.FLAME_STATUS", "data_type": "String"}
                }
            },
            {
                "instance_id": "elem-prv",
                "symbol_id": "sym-valve-relief-prv",
                "label": "PSV-101",
                "x": 420,
                "y": 140,
                "width": 60,
                "height": 70,
                "rotation": 0,
                "bindings": {}
            },
            {
                "instance_id": "elem-press-gauge",
                "symbol_id": "sym-inst-pt",
                "label": "PIT-101",
                "x": 520,
                "y": 180,
                "width": 50,
                "height": 60,
                "rotation": 0,
                "bindings": {
                    "tag_name": {"tag_name": "PIC_101.PV", "data_type": "Float"}
                }
            }
        ],
        "connections": []
    },
    {
        "id": "tpl-chiller-cooling-tower",
        "name": "Chiller & Cooling Tower Closed Circuit",
        "category": "HVAC & Utility",
        "description": "Centrifugal chiller with condenser water loop connected to induced draft cooling tower.",
        "width": 1200,
        "height": 800,
        "expected_asset_roles": [
            {"role": "chiller", "label": "Chiller CH-101", "type": "CHILLER", "suggested_tags": ["CH_101.KW", "CH_101.COP"]},
            {"role": "cooling_tower", "label": "Cooling Tower CT-101", "type": "COOLING_TOWER", "suggested_tags": ["CT_101.FAN_SPEED", "CT_101.BASIN_TEMP"]}
        ],
        "elements": [
            {
                "instance_id": "elem-tower",
                "symbol_id": "sym-cooling-tower-induced",
                "label": "Cooling Tower CT-101",
                "x": 160,
                "y": 180,
                "width": 130,
                "height": 140,
                "rotation": 0,
                "bindings": {
                    "fan_running": {"tag_name": "CT_101.FAN_RUNNING", "data_type": "Boolean"}
                }
            },
            {
                "instance_id": "elem-cw-pump",
                "symbol_id": "sym-pump-centrif-horiz",
                "label": "Condenser Water Pump P-201",
                "x": 360,
                "y": 320,
                "width": 75,
                "height": 75,
                "rotation": 0,
                "bindings": {
                    "running": {"tag_name": "P_201.RUNNING", "data_type": "Boolean"}
                }
            }
        ],
        "connections": []
    }
]
