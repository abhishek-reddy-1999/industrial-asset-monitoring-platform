import json

def align_scada_pool():
    store_file = "backend/scada_store_state.json"
    with open(store_file, "r", encoding="utf-8") as f:
        store = json.load(f)

    # 1. Update screen-swimming-pool elements with precise alignment
    # Main horizontal centerline is Y = 520
    # Top pool centerline is Y = 180
    aligned_elements = [
        # --- UPPER POOL BASIN & LEVEL INSTRUMENTS ---
        {
            "instance_id": "inst-pool-level-dial",
            "symbol_id": "sym-analog-dial-level",
            "label": "Water Level Gauge",
            "x": 250,
            "y": 140,
            "width": 75,
            "height": 75,
            "bindings": {
                "pv_value": {"mode": "DYNAMIC", "tag_name": "POOL_LEVEL.PV", "attribute_name": "Water Level %", "value": 98.2, "uom": "%"},
                "status": {"mode": "DYNAMIC", "tag_name": "POOL_STATUS", "attribute_name": "Operating Status", "value": "Active"}
            }
        },
        {
            "instance_id": "inst-pool-basin",
            "symbol_id": "sym-3d-pool-basin",
            "label": "Commercial Swimming Pool Basin (55,000 L)",
            "x": 340,
            "y": 80,
            "width": 640,
            "height": 200,
            "bindings": {
                "level": {"mode": "DYNAMIC", "tag_name": "POOL_LEVEL.PV", "attribute_name": "Level %", "value": 98.2, "uom": "%"},
                "volume": {"mode": "DYNAMIC", "tag_name": "POOL_VOLUME.PV", "attribute_name": "Pool Volume", "value": 55000, "uom": "L"},
                "temp": {"mode": "DYNAMIC", "tag_name": "POOL_TEMP.PV", "attribute_name": "Water Temperature", "value": 35.9, "uom": "°C"}
            }
        },
        {
            "instance_id": "inst-volume-badge",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "Pool Water Capacity",
            "x": 585,
            "y": 290,
            "width": 150,
            "height": 45,
            "bindings": {
                "pv_value": {"mode": "DYNAMIC", "tag_name": "POOL_VOLUME.PV", "attribute_name": "Total Water Volume", "value": 55000, "uom": "L"}
            }
        },
        {
            "instance_id": "inst-valve-drain-1",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 1 (Pool Suction Drain)",
            "x": 358,
            "y": 355,
            "width": 45,
            "height": 55,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_1", "attribute_name": "Valve Position", "value": "OPEN"}
            }
        },
        {
            "instance_id": "inst-valve-return",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 9 (Return Isolation Valve)",
            "x": 1050,
            "y": 150,
            "width": 90,
            "height": 45,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_9", "attribute_name": "Valve Position", "value": "OPEN"}
            }
        },

        # --- MAIN PROCESS CENTERLINE (Y = 520) ---
        {
            "instance_id": "inst-valve-supply",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 2 (Water Supply)",
            "x": 100,
            "y": 495,
            "width": 55,
            "height": 50,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_2", "attribute_name": "Fresh Water Supply Valve", "value": "OPEN"}
            }
        },
        {
            "instance_id": "inst-hair-strainer",
            "symbol_id": "sym-3d-lint-strainer",
            "label": "Hair & Lint Pre-Filter",
            "x": 230,
            "y": 475,
            "width": 55,
            "height": 90,
            "bindings": {
                "dp": {"mode": "DYNAMIC", "tag_name": "FILTER_DP.PV", "attribute_name": "Differential Pressure", "value": 0.12, "uom": "bar"}
            }
        },
        {
            "instance_id": "inst-circ-pump",
            "symbol_id": "sym-3d-pool-pump",
            "label": "Circulation Pump P-101",
            "x": 340,
            "y": 465,
            "width": 150,
            "height": 110,
            "bindings": {
                "running": {"mode": "DYNAMIC", "tag_name": "FILTER_PUMP.RUN", "attribute_name": "Run Status", "value": 1},
                "speed": {"mode": "DYNAMIC", "tag_name": "PUMP_SPEED.PV", "attribute_name": "Motor RPM", "value": 2150, "uom": "RPM"},
                "flow": {"mode": "DYNAMIC", "tag_name": "FLOW_RATE.PV", "attribute_name": "Flow Rate", "value": 198, "uom": "L/min"}
            }
        },
        {
            "instance_id": "inst-valve-post-pump",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 4 (Pump Discharge)",
            "x": 540,
            "y": 495,
            "width": 55,
            "height": 50,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_4", "attribute_name": "Pump Discharge Valve", "value": "OPEN"}
            }
        },
        {
            "instance_id": "inst-sand-filter",
            "symbol_id": "sym-3d-sand-filter",
            "label": "High-Rate Sand Filter SF-201",
            "x": 645,
            "y": 430,
            "width": 140,
            "height": 180,
            "bindings": {
                "mode": {"mode": "DYNAMIC", "tag_name": "FILTER_MODE.VAL", "attribute_name": "Multiport Mode", "value": "Filter"},
                "dp": {"mode": "DYNAMIC", "tag_name": "FILTER_DP.PV", "attribute_name": "Differential Pressure", "value": 0.42, "uom": "bar"}
            }
        },
        {
            "instance_id": "inst-valve-waste",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 5 (Backwash Waste Drain)",
            "x": 765,
            "y": 625,
            "width": 45,
            "height": 55,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_5", "attribute_name": "Backwash Drain Valve", "value": "OPEN"}
            }
        },
        {
            "instance_id": "inst-flowmeter",
            "symbol_id": "sym-3d-flow-meter",
            "label": "Flow Transmitter FT-101",
            "x": 835,
            "y": 490,
            "width": 60,
            "height": 60,
            "bindings": {
                "pv_value": {"mode": "DYNAMIC", "tag_name": "FLOW_RATE.PV", "attribute_name": "Circulation Flow Rate", "value": 198, "uom": "L/min"}
            }
        },
        {
            "instance_id": "inst-valve-bypass",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 8 (Heater Bypass)",
            "x": 945,
            "y": 495,
            "width": 55,
            "height": 50,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_8", "attribute_name": "Heater Bypass Valve", "value": "CLOSED"}
            }
        },
        {
            "instance_id": "inst-valve-heat-in",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 6 (Heater Inlet)",
            "x": 925,
            "y": 575,
            "width": 45,
            "height": 55,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_6", "attribute_name": "Heat Pump Feed Valve", "value": "OPEN"}
            }
        },
        {
            "instance_id": "inst-valve-heat-out",
            "symbol_id": "sym-valve-gate",
            "label": "Valve 7 (Heater Outlet)",
            "x": 1070,
            "y": 575,
            "width": 45,
            "height": 55,
            "bindings": {
                "state": {"mode": "DYNAMIC", "tag_name": "VALVE_7", "attribute_name": "Heat Pump Return Valve", "value": "OPEN"}
            }
        },
        {
            "instance_id": "inst-heat-pump",
            "symbol_id": "sym-3d-heat-pump",
            "label": "Inverter Heat Pump HP-301",
            "x": 970,
            "y": 660,
            "width": 175,
            "height": 135,
            "bindings": {
                "running": {"mode": "DYNAMIC", "tag_name": "HEAT_PUMP.RUN", "attribute_name": "Run Status", "value": 1},
                "setpoint": {"mode": "DYNAMIC", "tag_name": "TARGET_TEMP.SP", "attribute_name": "Target Temperature", "value": 36.0, "uom": "°C"},
                "pv_value": {"mode": "DYNAMIC", "tag_name": "POOL_TEMP.PV", "attribute_name": "Current Pool Temp", "value": 35.9, "uom": "°C"}
            }
        },
        {
            "instance_id": "inst-ph-canister",
            "symbol_id": "sym-dosing-canister-ph",
            "label": "pH / Chlorine Injection Cell",
            "x": 1180,
            "y": 470,
            "width": 65,
            "height": 100,
            "bindings": {
                "ph": {"mode": "DYNAMIC", "tag_name": "POOL_PH.PV", "attribute_name": "pH Level", "value": 7.35, "uom": "pH"},
                "orp": {"mode": "DYNAMIC", "tag_name": "POOL_ORP.PV", "attribute_name": "Redox Potential", "value": 715, "uom": "mV"}
            }
        }
    ]

    # Clean, orthogonal, flanged connections with ports
    aligned_connections = [
        # 1. Fresh water supply line to hair strainer
        {
            "id": "conn-supply",
            "from_id": "inst-valve-supply",
            "from_port": "outlet",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#94a3b8",
            "width": 4,
            "animated": True,
            "label": "Supply"
        },
        # 2. Pool suction drain line down to hair strainer
        {
            "id": "conn-pool-drain",
            "from_id": "inst-pool-basin",
            "from_port": "skimmer",
            "to_id": "inst-valve-drain-1",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True,
            "label": "Suction"
        },
        {
            "id": "conn-drain-valve-strainer",
            "from_id": "inst-valve-drain-1",
            "from_port": "outlet",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # 3. Hair strainer to circulation pump
        {
            "id": "conn-strainer-pump",
            "from_id": "inst-hair-strainer",
            "from_port": "outlet",
            "to_id": "inst-circ-pump",
            "to_port": "suction",
            "color": "#38bdf8",
            "width": 5,
            "animated": True
        },
        # 4. Circulation pump discharge to Valve 4
        {
            "id": "conn-pump-valve4",
            "from_id": "inst-circ-pump",
            "from_port": "discharge",
            "to_id": "inst-valve-post-pump",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # 5. Valve 4 to sand filter inlet
        {
            "id": "conn-valve4-filter",
            "from_id": "inst-valve-post-pump",
            "from_port": "outlet",
            "to_id": "inst-sand-filter",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # 6. Sand filter outlet to flowmeter
        {
            "id": "conn-filter-flow",
            "from_id": "inst-sand-filter",
            "from_port": "outlet",
            "to_id": "inst-flowmeter",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # 7. Sand filter waste drain down to Valve 5
        {
            "id": "conn-filter-waste",
            "from_id": "inst-sand-filter",
            "from_port": "waste",
            "to_id": "inst-valve-waste",
            "to_port": "inlet",
            "color": "#0284c7",
            "width": 4,
            "animated": False,
            "label": "Drain"
        },
        # 8. Flowmeter to bypass valve / heater branch
        {
            "id": "conn-flow-bypass",
            "from_id": "inst-flowmeter",
            "from_port": "outlet",
            "to_id": "inst-valve-bypass",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # 9. Feed down into heater valve 6
        {
            "id": "conn-feed-heater",
            "from_id": "inst-valve-bypass",
            "from_port": "inlet",
            "to_id": "inst-valve-heat-in",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        {
            "id": "conn-valveh-heater",
            "from_id": "inst-valve-heat-in",
            "from_port": "outlet",
            "to_id": "inst-heat-pump",
            "to_port": "water_in",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # 10. Heater return out through valve 7
        {
            "id": "conn-heater-valve7",
            "from_id": "inst-heat-pump",
            "from_port": "water_out",
            "to_id": "inst-valve-heat-out",
            "to_port": "inlet",
            "color": "#f87171",
            "width": 4,
            "animated": True
        },
        {
            "id": "conn-valve7-ph",
            "from_id": "inst-valve-heat-out",
            "from_port": "outlet",
            "to_id": "inst-ph-canister",
            "to_port": "inlet",
            "color": "#f87171",
            "width": 4,
            "animated": True
        },
        # 11. pH canister return riser to Return Valve 9
        {
            "id": "conn-ph-valve9",
            "from_id": "inst-ph-canister",
            "from_port": "outlet",
            "to_id": "inst-valve-return",
            "to_port": "inlet",
            "color": "#f87171",
            "width": 4,
            "animated": True,
            "label": "Heated Return"
        },
        # 12. Valve 9 into Pool Basin
        {
            "id": "conn-valve9-pool",
            "from_id": "inst-valve-return",
            "from_port": "outlet",
            "to_id": "inst-pool-basin",
            "to_port": "return_jets",
            "color": "#f87171",
            "width": 4,
            "animated": True
        }
    ]

    for sc in store['screens']:
        if sc['id'] == 'screen-swimming-pool':
            sc['elements'] = aligned_elements
            sc['connections'] = aligned_connections
            sc['width'] = 1440
            sc['height'] = 900
            print("Successfully updated screen-swimming-pool with aligned elements & connections!")
            break

    with open(store_file, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2)
    print("Saved store_file successfully!")

if __name__ == "__main__":
    align_scada_pool()
