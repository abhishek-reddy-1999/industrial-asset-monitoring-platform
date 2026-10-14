import json

def build_aligned_pool_screen():
    # 1. Elements with exact laser-aligned coordinates
    elements = [
        # Pool Basin & Gauges
        {
            "instance_id": "inst-pool-level-dial",
            "symbol_id": "sym-analog-dial-level",
            "label": "Water Level",
            "x": 230,
            "y": 140,
            "width": 75,
            "height": 75,
            "bindings": {
                "level": {
                    "tag_name": "pool.water_level",
                    "attribute_name": "Water Level",
                    "uom": "%",
                    "value": 84.5
                }
            }
        },
        {
            "instance_id": "inst-pool-basin",
            "symbol_id": "sym-3d-pool-basin",
            "label": "Commercial Swimming Pool Basin (55,000 L)",
            "x": 340,
            "y": 75,
            "width": 640,
            "height": 200,
            "bindings": {
                "temperature": {
                    "tag_name": "pool.water_temp",
                    "attribute_name": "Water Temperature",
                    "uom": "\u00b0C",
                    "value": 28.4
                },
                "ph": {
                    "tag_name": "pool.ph_level",
                    "attribute_name": "pH Level",
                    "uom": "pH",
                    "value": 7.35
                },
                "orp": {
                    "tag_name": "pool.orp_mv",
                    "attribute_name": "ORP Redox",
                    "uom": "mV",
                    "value": 718.0
                }
            }
        },
        {
            "instance_id": "inst-volume-badge",
            "symbol_id": "sym-hmi-digital-readout",
            "label": "Water Capacity",
            "x": 585,
            "y": 285,
            "width": 150,
            "height": 45,
            "bindings": {
                "volume": {
                    "tag_name": "pool.water_volume",
                    "attribute_name": "Total Volume",
                    "uom": "L",
                    "value": 55000
                }
            }
        },

        # Upper Return Isolation Valve (Valve 9) - horizontal spoke valve at y=175
        {
            "instance_id": "inst-valve-return",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 9 (Return Isolation)",
            "x": 1030,
            "y": 154,  # h=42, center y=175
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

        # Pool Suction Drain Isolation Valve (Valve 1) - vertical at x=150
        {
            "instance_id": "inst-valve-drain-1",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 1 (Pool Suction)",
            "x": 105,  # centered at x=150
            "y": 280,
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

        # Fresh Water Make-Up Supply Valve (Valve 2)
        {
            "instance_id": "inst-valve-supply",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 2 (Water Supply)",
            "x": 30,
            "y": 499,  # h=42, center y=520
            "width": 90,
            "height": 42,
            "bindings": {
                "status": {
                    "tag_name": "valve.v2.status",
                    "attribute_name": "State",
                    "value": "CLOSED"
                }
            }
        },

        # Hair & Lint Strainer (Pre-Filter)
        {
            "instance_id": "inst-hair-strainer",
            "symbol_id": "sym-3d-lint-strainer",
            "label": "Hair & Lint Pre-Filter",
            "x": 220,
            "y": 475,  # w=55, h=90, center y=520
            "width": 55,
            "height": 90,
            "bindings": {
                "dp": {
                    "tag_name": "strainer.differential_p",
                    "attribute_name": "Delta Pressure",
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
            "y": 465,  # w=150, h=110, suction at y=520
            "width": 150,
            "height": 110,
            "bindings": {
                "flow_rate": {
                    "tag_name": "pump.circulation.flow_rate",
                    "attribute_name": "Discharge Flow",
                    "uom": "m\u00b3/h",
                    "value": 24.8
                },
                "speed": {
                    "tag_name": "pump.circulation.speed_rpm",
                    "attribute_name": "Impeller Speed",
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

        # Pump Discharge Isolation Valve (Valve 4)
        {
            "instance_id": "inst-valve-post-pump",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 4 (Discharge)",
            "x": 530,
            "y": 499,  # h=42, center y=520
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

        # Sand Filter SF-201
        {
            "instance_id": "inst-sand-filter",
            "symbol_id": "sym-3d-sand-filter",
            "label": "High-Rate Sand Filter SF-201",
            "x": 660,
            "y": 430,  # w=140, h=180, multiport nozzles at y=520
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
                    "tag_name": "filter.sand.differential_p",
                    "attribute_name": "Bed Delta P",
                    "uom": "bar",
                    "value": 0.32
                },
                "turbidity": {
                    "tag_name": "filter.sand.turbidity",
                    "attribute_name": "Effluent Turbidity",
                    "uom": "NTU",
                    "value": 0.45
                }
            }
        },

        # Backwash Waste Drain Valve (Valve 5)
        {
            "instance_id": "inst-valve-waste",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 5 (Backwash Waste)",
            "x": 720,
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

        # Digital Flowmeter FT-101
        {
            "instance_id": "inst-flowmeter",
            "symbol_id": "sym-3d-flow-meter",
            "label": "Flow Transmitter FT-101",
            "x": 845,
            "y": 490,  # w=60, h=60, center y=520
            "width": 60,
            "height": 60,
            "bindings": {
                "flow": {
                    "tag_name": "flowmeter.ft101.rate",
                    "attribute_name": "Instantaneous Flow",
                    "uom": "m\u00b3/h",
                    "value": 24.6
                },
                "totalizer": {
                    "tag_name": "flowmeter.ft101.total_m3",
                    "attribute_name": "Total Volume",
                    "uom": "m\u00b3",
                    "value": 14820
                }
            }
        },

        # Heater Bypass Valve (Valve 8)
        {
            "instance_id": "inst-valve-bypass",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 8 (Heater Bypass)",
            "x": 950,
            "y": 499,  # h=42, center y=520
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

        # Heater Inlet Valve (Valve 6) - centered at x=950
        {
            "instance_id": "inst-valve-heat-in",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 6 (Heater Inlet)",
            "x": 905,  # centered at x=950
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

        # Heater Outlet Valve (Valve 7) - centered at x=1121
        {
            "instance_id": "inst-valve-heat-out",
            "symbol_id": "sym-3d-spoke-valve",
            "label": "Valve 7 (Heater Outlet)",
            "x": 1076,  # centered at x=1121
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

        # Inverter Heat Pump HP-301 - starts at x=946 so water_in is at x=950, ends at 1121
        {
            "instance_id": "inst-heat-pump",
            "symbol_id": "sym-3d-heat-pump",
            "label": "Inverter Heat Pump HP-301",
            "x": 946,
            "y": 660,
            "width": 175,
            "height": 135,
            "bindings": {
                "status": {
                    "tag_name": "heatpump.compressor.state",
                    "attribute_name": "Compressor State",
                    "value": "RUNNING"
                },
                "setpoint": {
                    "tag_name": "heatpump.water_temp_sp",
                    "attribute_name": "Target Setpoint",
                    "uom": "\u00b0C",
                    "value": 29.0
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
                    "value": 31.8
                },
                "ambient_temp": {
                    "tag_name": "heatpump.ambient_temp",
                    "attribute_name": "Ambient Temp",
                    "uom": "\u00b0C",
                    "value": 23.5
                },
                "cop": {
                    "tag_name": "heatpump.cop_efficiency",
                    "attribute_name": "COP Efficiency",
                    "value": 5.4
                }
            }
        },

        # Chemical Dosing Injection Cell CH-401
        {
            "instance_id": "inst-ph-canister",
            "symbol_id": "sym-dosing-canister-ph",
            "label": "pH & Chlorine Injection Cell CH-401",
            "x": 1180,
            "y": 470,  # w=65, h=100, center y=520
            "width": 65,
            "height": 100,
            "bindings": {
                "ph_value": {
                    "tag_name": "chemical.ph_sensor",
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

    # 2. Connections with precise orthogonal ports
    connections = [
        # Fresh water supply to pre-filter
        {
            "id": "conn-supply",
            "from_id": "inst-valve-supply",
            "from_port": "outlet",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#94a3b8",
            "width": 4,
            "animated": True,
            "label": "City Water Make-Up"
        },
        # Pool skimmer drain drops down to Valve 1
        {
            "id": "conn-pool-drain",
            "from_id": "inst-pool-basin",
            "from_port": "skimmer",
            "to_id": "inst-valve-drain-1",
            "to_port": "top",
            "color": "#38bdf8",
            "width": 4,
            "animated": True,
            "label": "Pool Skimmer Suction"
        },
        # Drain valve drops into strainer inlet header
        {
            "id": "conn-drain-valve-strainer",
            "from_id": "inst-valve-drain-1",
            "from_port": "bottom",
            "to_id": "inst-hair-strainer",
            "to_port": "inlet",
            "color": "#38bdf8",
            "width": 4,
            "animated": True
        },
        # Strainer to Pump
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
        # Pump to Discharge Valve 4
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
        # Valve 4 to Sand Filter inlet
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
        # Sand Filter outlet to Flowmeter
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
        # Sand Filter backwash waste to Valve 5
        {
            "id": "conn-filter-waste",
            "from_id": "inst-sand-filter",
            "from_port": "waste",
            "to_id": "inst-valve-waste",
            "to_port": "top",
            "color": "#0284c7",
            "width": 4,
            "animated": False,
            "label": "Backwash Drain"
        },
        # Flowmeter to Heater Bypass Valve
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
        # Feed down into Heater Inlet Valve 6
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
        # Valve 6 into Heat Pump water_in
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
        # Heat Pump water_out up to Valve 7
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
        # Valve 7 into Chemical Cell inlet
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
        # Chemical Cell outlet up to Return Valve 9
        {
            "id": "conn-ph-valve9",
            "from_id": "inst-ph-canister",
            "from_port": "outlet",
            "to_id": "inst-valve-return",
            "to_port": "outlet",
            "color": "#f87171",
            "width": 4,
            "animated": True,
            "label": "Treated Water Return"
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
    elems, conns = build_aligned_pool_screen()
    print(f"Generated {len(elems)} elements and {len(conns)} connections.")
