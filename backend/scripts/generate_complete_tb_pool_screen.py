import json

def build_complete_pool_screen():
    # 22 Complete Elements matching ThingsBoard SCADA Pool
    elements = [
        # --- Top Left KPI Cards ---
        {
            "instance_id": "inst-kpi-status",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "System Status",
            "x": 30,
            "y": 60,
            "width": 140,
            "height": 45,
            "bindings": {
                "status": {
                    "tag_name": "pool.system_status",
                    "attribute_name": "Status",
                    "value": "ACTIVE"
                }
            }
        },
        {
            "instance_id": "inst-kpi-outdoor",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "Outdoor Temperature",
            "x": 30,
            "y": 120,
            "width": 140,
            "height": 45,
            "bindings": {
                "temp": {
                    "tag_name": "OUTDOOR_TEMP.PV",
                    "attribute_name": "Outdoor Temp",
                    "uom": "\u00b0C",
                    "value": 26.6
                }
            }
        },
        {
            "instance_id": "inst-kpi-target",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "Target Setpoint",
            "x": 30,
            "y": 180,
            "width": 140,
            "height": 45,
            "bindings": {
                "sp": {
                    "tag_name": "TARGET_TEMP.SP",
                    "attribute_name": "Target SP",
                    "uom": "\u00b0C",
                    "value": 36.0
                }
            }
        },
        {
            "instance_id": "inst-kpi-pool-temp",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "Pool Water Temp",
            "x": 30,
            "y": 240,
            "width": 140,
            "height": 45,
            "bindings": {
                "temp": {
                    "tag_name": "POOL_TEMP.PV",
                    "attribute_name": "Pool Temp",
                    "uom": "\u00b0C",
                    "value": 35.9
                }
            }
        },

        # --- Commercial Pool Basin & Gauges ---
        {
            "instance_id": "inst-pool-level-dial",
            "symbol_id": "sym-analog-dial-level",
            "label": "Water Level",
            "x": 245,
            "y": 135,
            "width": 75,
            "height": 75,
            "bindings": {
                "level": {
                    "tag_name": "POOL_LEVEL.PV",
                    "attribute_name": "Water Level",
                    "uom": "%",
                    "value": 98.2
                }
            }
        },
        {
            "instance_id": "inst-pool-basin",
            "symbol_id": "sym-3d-pool-basin",
            "label": "Commercial Swimming Pool Basin (55,000 L)",
            "x": 340,
            "y": 70,
            "width": 640,
            "height": 200,
            "bindings": {
                "temperature": {
                    "tag_name": "POOL_TEMP.PV",
                    "attribute_name": "Water Temperature",
                    "uom": "\u00b0C",
                    "value": 35.9
                },
                "ph": {
                    "tag_name": "POOL_PH.PV",
                    "attribute_name": "pH Level",
                    "uom": "pH",
                    "value": 7.35
                },
                "orp": {
                    "tag_name": "POOL_ORP.PV",
                    "attribute_name": "ORP Redox",
                    "uom": "mV",
                    "value": 718.0
                }
            }
        },
        {
            "instance_id": "inst-volume-badge",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "Capacity",
            "x": 585,
            "y": 280,
            "width": 150,
            "height": 45,
            "bindings": {
                "volume": {
                    "tag_name": "POOL_VOLUME.PV",
                    "attribute_name": "Total Volume",
                    "uom": "L",
                    "value": 55000
                }
            }
        },

        # --- Pool Return Valve 9 (Upper Right) ---
        {
            "instance_id": "inst-valve-return",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 9 (Return Isolation)",
            "x": 1030,
            "y": 154,  # h=42, center Y=175
            "width": 90,
            "height": 42,
            "bindings": {
                "status": {
                    "tag_name": "valve.v9.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # --- Suction Valves (Left Side) ---
        # Valve 1: Pool Skimmer Suction (vertical drop at X=150)
        {
            "instance_id": "inst-valve-drain-1",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 1 (Skimmer Suction)",
            "x": 105,  # centered at X=150
            "y": 270,
            "width": 90,
            "height": 42,
            "rotation": 90,
            "bindings": {
                "status": {
                    "tag_name": "valve.v1.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # Valve 3: Main Pool Bottom Drain (vertical drop at X=380)
        {
            "instance_id": "inst-valve-drain-3",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 3 (Main Bottom Drain)",
            "x": 335,  # centered at X=380
            "y": 320,
            "width": 90,
            "height": 42,
            "rotation": 90,
            "bindings": {
                "status": {
                    "tag_name": "valve.v3.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # Valve 2: City Water Make-Up Supply (horizontal along Y=520)
        {
            "instance_id": "inst-valve-supply",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 2 (Water Supply)",
            "x": 30,
            "y": 499,  # h=42, center Y=520
            "width": 90,
            "height": 42,
            "bindings": {
                "status": {
                    "tag_name": "valve.v2.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # --- Main Process Header (Centerline Y=520) ---
        # Hair & Lint Strainer (Pre-Filter)
        {
            "instance_id": "inst-hair-strainer",
            "symbol_id": "sym-3d-lint-strainer",
            "label": "Hair & Lint Pre-Filter",
            "x": 220,
            "y": 475,  # w=55, h=90, center Y=520
            "width": 55,
            "height": 90,
            "bindings": {
                "dp": {
                    "tag_name": "FILTER_DP.PV",
                    "attribute_name": "Differential Pressure",
                    "uom": "bar",
                    "value": 0.08
                }
            }
        },

        # Circulation Pump P-101
        {
            "instance_id": "inst-circ-pump",
            "symbol_id": "sym-3d-pool-pump",
            "label": "Circulation Pump P-101",
            "x": 340,
            "y": 465,  # w=150, h=110, suction at Y=520
            "width": 150,
            "height": 110,
            "bindings": {
                "flow_rate": {
                    "tag_name": "FLOW_RATE.PV",
                    "attribute_name": "Flow Rate",
                    "uom": "L/min",
                    "value": 198
                },
                "speed": {
                    "tag_name": "pump.circulation.speed_rpm",
                    "attribute_name": "Rotation Speed",
                    "uom": "RPM",
                    "value": 2850
                },
                "power": {
                    "tag_name": "pump.circulation.power_kw",
                    "attribute_name": "Motor Power",
                    "uom": "kW",
                    "value": 2.2
                },
                "motor_temp": {
                    "tag_name": "pump.circulation.motor_temp",
                    "attribute_name": "Winding Temp",
                    "uom": "\u00b0C",
                    "value": 46.2
                }
            }
        },

        # Valve 4: Pump Discharge Isolation
        {
            "instance_id": "inst-valve-post-pump",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 4 (Discharge)",
            "x": 530,
            "y": 499,  # h=42, center Y=520
            "width": 90,
            "height": 42,
            "bindings": {
                "status": {
                    "tag_name": "valve.v4.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # High-Rate Sand Filter SF-201
        {
            "instance_id": "inst-sand-filter",
            "symbol_id": "sym-3d-sand-filter",
            "label": "High-Rate Sand Filter SF-201",
            "x": 660,
            "y": 430,  # w=140, h=180, multiport nozzles at Y=520
            "width": 140,
            "height": 180,
            "bindings": {
                "pressure": {
                    "tag_name": "filter.sand.pressure",
                    "attribute_name": "Vessel Pressure",
                    "uom": "bar",
                    "value": 1.25
                },
                "diff_pressure": {
                    "tag_name": "FILTER_DP.PV",
                    "attribute_name": "Bed Delta P",
                    "uom": "bar",
                    "value": 0.42
                },
                "turbidity": {
                    "tag_name": "filter.sand.turbidity",
                    "attribute_name": "Effluent Turbidity",
                    "uom": "NTU",
                    "value": 0.45
                }
            }
        },

        # Valve 5: Backwash Waste Drain (vertical at X=765)
        {
            "instance_id": "inst-valve-waste",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 5 (Backwash Waste Drain)",
            "x": 720,  # centered at X=765
            "y": 640,
            "width": 90,
            "height": 42,
            "rotation": 90,
            "bindings": {
                "status": {
                    "tag_name": "valve.v5.status",
                    "attribute_name": "State",
                    "value": "CLOSED"
                }
            }
        },

        # Flow Transmitter FT-101
        {
            "instance_id": "inst-flowmeter",
            "symbol_id": "sym-3d-flow-meter",
            "label": "Flow Transmitter FT-101 (198 L/min)",
            "x": 845,
            "y": 490,  # w=60, h=60, center Y=520
            "width": 60,
            "height": 60,
            "bindings": {
                "flow": {
                    "tag_name": "FLOW_RATE.PV",
                    "attribute_name": "Flow Rate",
                    "uom": "L/min",
                    "value": 198
                },
                "totalizer": {
                    "tag_name": "flowmeter.ft101.total_m3",
                    "attribute_name": "Total Volume",
                    "uom": "m\u00b3",
                    "value": 14820
                }
            }
        },

        # Valve 8: Heater Bypass Valve (closed by default)
        {
            "instance_id": "inst-valve-bypass",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 8 (Heater Bypass)",
            "x": 950,
            "y": 499,  # h=42, center Y=520
            "width": 90,
            "height": 42,
            "bindings": {
                "status": {
                    "tag_name": "valve.v8.status",
                    "attribute_name": "State",
                    "value": "CLOSED"
                }
            }
        },

        # Valve 6: Heater Inlet Isolation (vertical drop at X=950)
        {
            "instance_id": "inst-valve-heat-in",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 6 (Heater Inlet)",
            "x": 905,  # centered at X=950
            "y": 575,
            "width": 90,
            "height": 42,
            "rotation": 90,
            "bindings": {
                "status": {
                    "tag_name": "valve.v6.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # Valve 7: Heater Outlet Isolation (vertical riser at X=1121)
        {
            "instance_id": "inst-valve-heat-out",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 7 (Heater Outlet)",
            "x": 1076,  # centered at X=1121
            "y": 575,
            "width": 90,
            "height": 42,
            "rotation": 90,
            "bindings": {
                "status": {
                    "tag_name": "valve.v7.status",
                    "attribute_name": "State",
                    "value": "OPEN"
                }
            }
        },

        # Inverter Heat Pump HP-301
        {
            "instance_id": "inst-heat-pump",
            "symbol_id": "sym-3d-heat-pump",
            "label": "Inverter Heat Pump HP-301 (36 \u00b0C)",
            "x": 950,
            "y": 660,
            "width": 171,
            "height": 135,
            "bindings": {
                "status": {
                    "tag_name": "HEAT_PUMP.RUN",
                    "attribute_name": "Compressor State",
                    "value": "RUNNING"
                },
                "setpoint": {
                    "tag_name": "TARGET_TEMP.SP",
                    "attribute_name": "Target Setpoint",
                    "uom": "\u00b0C",
                    "value": 36.0
                },
                "inlet_temp": {
                    "tag_name": "heatpump.inlet_temp",
                    "attribute_name": "Inlet Temp",
                    "uom": "\u00b0C",
                    "value": 26.2
                },
                "outlet_temp": {
                    "tag_name": "heatpump.outlet_temp",
                    "attribute_name": "Outlet Temp",
                    "uom": "\u00b0C",
                    "value": 36.0
                },
                "ambient_temp": {
                    "tag_name": "OUTDOOR_TEMP.PV",
                    "attribute_name": "Ambient Temp",
                    "uom": "\u00b0C",
                    "value": 26.6
                },
                "cop": {
                    "tag_name": "heatpump.cop_efficiency",
                    "attribute_name": "COP Efficiency",
                    "value": 5.4
                }
            }
        },

        # Chemical Dosing & Disinfection Cell CH-401 (pH)
        {
            "instance_id": "inst-ph-canister",
            "symbol_id": "sym-dosing-canister-ph",
            "label": "pH & Chlorine Injection Cell CH-401",
            "x": 1180,
            "y": 470,  # w=65, h=100, center Y=520
            "width": 65,
            "height": 100,
            "bindings": {
                "ph_value": {
                    "tag_name": "POOL_PH.PV",
                    "attribute_name": "pH Level",
                    "uom": "pH",
                    "value": 7.35
                },
                "chlorine_ppm": {
                    "tag_name": "chemical.chlorine_ppm",
                    "attribute_name": "Free Chlorine",
                    "uom": "ppm",
                    "value": 1.85
                },
                "dosing_state": {
                    "tag_name": "chemical.pump_state",
                    "attribute_name": "Dosing Status",
                    "value": "ACTIVE"
                }
            }
        }
    ]

    # 17 Precise Orthogonal Process Connections
    connections = [
        # City Water Make-Up to Suction Manifold
        {
            "id": "conn-supply",
            "from_id": "inst-valve-supply",
            "from_port": "outlet",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#94a3b8",
            "width": 4,
            "animated": True,
            "label": "Water supply"
        },
        # Pool Skimmer Suction to Valve 1
        {
            "id": "conn-pool-skimmer",
            "from_id": "inst-pool-basin",
            "from_port": "skimmer",
            "to_id": "inst-valve-drain-1",
            "to_port": "top",
            "color": "#38bdf8",
            "width": 4,
            "animated": True,
            "label": "Skimmer"
        },
        # Valve 1 Outlet to Strainer Inlet
        {
            "id": "conn-v1-strainer",
            "from_id": "inst-valve-drain-1",
            "from_port": "bottom",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # Pool Bottom Drain to Valve 3
        {
            "id": "conn-pool-bottom-drain",
            "from_id": "inst-pool-basin",
            "from_port": "bottom",
            "to_id": "inst-valve-drain-3",
            "to_port": "top",
            "color": "#38bdf8",
            "width": 4,
            "animated": True,
            "label": "Main Drain"
        },
        # Valve 3 to Strainer Inlet
        {
            "id": "conn-v3-strainer",
            "from_id": "inst-valve-drain-3",
            "from_port": "bottom",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # Strainer to Circulation Pump P-101
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
        # Pump Discharge to Valve 4
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
        # Valve 4 to Sand Filter SF-201 Multi-Port Inlet
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
        # Sand Filter Multi-Port Outlet to Flowmeter FT-101
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
        # Sand Filter Backwash Waste Port to Valve 5
        {
            "id": "conn-filter-waste",
            "from_id": "inst-sand-filter",
            "from_port": "waste",
            "to_id": "inst-valve-waste",
            "to_port": "top",
            "color": "#0284c7",
            "width": 4,
            "animated": False,
            "label": "Water drain"
        },
        # Flowmeter to Heater Bypass Valve 8
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
        # Heater Inlet Tee down into Valve 6 (carrying blue cold water)
        {
            "id": "conn-feed-heater",
            "from_id": "inst-valve-bypass",
            "from_port": "inlet",
            "to_id": "inst-valve-heat-in",
            "to_port": "top",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # Valve 6 into Inverter Heat Pump water_in
        {
            "id": "conn-valveh-heater",
            "from_id": "inst-valve-heat-in",
            "from_port": "bottom",
            "to_id": "inst-heat-pump",
            "to_port": "water_in",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # Heat Pump water_out up into Valve 7 (carrying red heated water)
        {
            "id": "conn-heater-valve7",
            "from_id": "inst-heat-pump",
            "from_port": "water_out",
            "to_id": "inst-valve-heat-out",
            "to_port": "bottom",
            "color": "#f87171",
            "width": 4,
            "animated": True
        },
        # Valve 7 up to Chemical Cell CH-401 Inlet
        {
            "id": "conn-valve7-ph",
            "from_id": "inst-valve-heat-out",
            "from_port": "top",
            "to_id": "inst-ph-canister",
            "to_port": "inlet",
            "color": "#f87171",
            "width": 4,
            "animated": True
        },
        # Chemical Cell CH-401 Outlet up to Return Valve 9
        {
            "id": "conn-ph-valve9",
            "from_id": "inst-ph-canister",
            "from_port": "outlet",
            "to_id": "inst-valve-return",
            "to_port": "outlet",
            "color": "#f87171",
            "width": 4,
            "animated": True,
            "label": "Heated Return"
        },
        # Return Valve 9 into Pool Return Jets
        {
            "id": "conn-valve9-pool",
            "from_id": "inst-valve-return",
            "from_port": "inlet",
            "to_id": "inst-pool-basin",
            "to_port": "return_jets",
            "color": "#f87171",
            "width": 4,
            "animated": True
        }
    ]

    return elements, connections

if __name__ == '__main__':
    elems, conns = build_complete_pool_screen()
    state_path = 'backend/scada_store_state.json'
    data = json.load(open(state_path, 'r', encoding='utf-8'))
    
    screen = next((s for s in data.get('screens', []) if s['id'] == 'screen-swimming-pool'), None)
    if screen:
        screen['elements'] = elems
        screen['connections'] = conns
        with open(state_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Successfully updated screen-swimming-pool with {len(elems)} elements and {len(conns)} connections in {state_path}!")
