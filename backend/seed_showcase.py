import urllib.request
import json
import sys

API_BASE = "http://localhost:91/api/v1"

# 1. Update CDU p2 widget to be a proper single-tag pie chart
try:
    cdu_res = urllib.request.urlopen(f"{API_BASE}/dashboards/refinery-cdu-overview")
    cdu_data = json.loads(cdu_res.read())
    layout = cdu_data.get("layout", [])

    # Update panel p2 if found
    for p in layout:
        if p.get("id") == "p2":
            p["type"] = "piechart"
            p["title"] = "CDU Asset Health Ratio (AHI_C101)"
            p["tags"] = ["AHI_C101.HEALTH"]
            p["min"] = 0
            p["max"] = 100
            p["unit"] = "%"
            p["accentColor"] = "#10b981"
            p["tagAliases"] = {"AHI_C101.HEALTH": "Asset Health Index"}
            print("Updated p2 in refinery-cdu-overview layout")

    req = urllib.request.Request(
        f"{API_BASE}/dashboards/refinery-cdu-overview",
        data=json.dumps({"layout": layout}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with urllib.request.urlopen(req) as response:
        print("CDU Dashboard update response:", response.read().decode())
except Exception as e:
    print("Error updating CDU dashboard:", e)

# 2. Create or Update Master Showcase Dashboard with all widgets
showcase_layout = [
    # Row 0 (Gauges & SingleStats)
    {
        "id": "w_singlestat",
        "type": "singlestat",
        "title": "Crude Feed Flow Rate (FIC-101)",
        "tags": ["FIC_101.PV"],
        "unit": "m³/h",
        "thresholds": [400, 650],
        "x": 0, "y": 0, "w": 3, "h": 4
    },
    {
        "id": "w_gauge",
        "type": "gauge",
        "title": "Overhead Pressure (PIC-101)",
        "tags": ["PIC_101.PV"],
        "min": 0, "max": 250, "unit": "kPa",
        "x": 3, "y": 0, "w": 3, "h": 4
    },
    {
        "id": "w_bullet",
        "type": "bullet_graph",
        "title": "Reboiler Temp Target (TIC-102)",
        "tags": ["TIC_102.PV"],
        "target": 240, "max": 350, "unit": "°C",
        "x": 6, "y": 0, "w": 3, "h": 4
    },
    {
        "id": "w_level",
        "type": "level_circle",
        "title": "Column Sump Level (LIC-101)",
        "tags": ["LIC_101.PV"],
        "min": 0, "max": 100, "unit": "%",
        "x": 9, "y": 0, "w": 3, "h": 4
    },

    # Row 4 (Donut / Card / Step Loader)
    {
        "id": "w_pie_single",
        "type": "piechart",
        "title": "Single Tag Capacity Donut (FIC-101)",
        "tags": ["FIC_101.PV"],
        "min": 0, "max": 800, "unit": "m³/h",
        "accentColor": "#38bdf8",
        "tagAliases": {"FIC_101.PV": "Feed Charge Active"},
        "x": 0, "y": 4, "w": 4, "h": 5
    },
    {
        "id": "w_card",
        "type": "card",
        "title": "CDU Asset Health Score (AHI-C101)",
        "tags": ["AHI_C101.HEALTH"],
        "unit": "%",
        "cardStyle": "glass",
        "thresholds": [70, 90],
        "x": 4, "y": 4, "w": 4, "h": 5
    },
    {
        "id": "w_loader",
        "type": "dynamic_loader",
        "title": "Booster Feed Dynamic Loader",
        "tags": ["FIC_101.PV"],
        "max": 800, "unit": "m³/h",
        "x": 8, "y": 4, "w": 4, "h": 5
    },

    # Row 9 (Trends & Bars)
    {
        "id": "w_timeseries",
        "type": "timeseries",
        "title": "Column Thermal Profile (TIC-101 & TIC-102)",
        "tags": ["TIC_101.PV", "TIC_102.PV"],
        "x": 0, "y": 9, "w": 6, "h": 5
    },
    {
        "id": "w_barchart",
        "type": "barchart",
        "title": "Mass Flow Rates Bar Comparison",
        "tags": ["FIC_101.PV", "FIC_102.PV"],
        "x": 6, "y": 9, "w": 6, "h": 5
    },

    # Row 14 (P&ID Synoptic + Multi-Tag Pie)
    {
        "id": "w_synoptic",
        "type": "synoptic",
        "title": "Distillation Unit C-101 P&ID Synoptic Mimic",
        "tags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV", "LIC_101.PV", "VIB_101.RMS"],
        "x": 0, "y": 14, "w": 8, "h": 6
    },
    {
        "id": "w_pie_multi",
        "type": "piechart",
        "title": "Multi-Tag Flow Ratio (FIC-101 / 102 / 201)",
        "tags": ["FIC_101.PV", "FIC_102.PV", "VDU_FIC_201.PV"],
        "tagAliases": {
            "FIC_101.PV": "CDU Crude Charge",
            "FIC_102.PV": "Naphtha Reflux",
            "VDU_FIC_201.PV": "VDU Residue Draw"
        },
        "unit": "m³/h",
        "x": 8, "y": 14, "w": 4, "h": 6
    },

    # Row 20 (Sankey + XY Plot)
    {
        "id": "w_sankey",
        "type": "sankey",
        "title": "Fractionation Mass & Energy Balance (Sankey)",
        "tags": ["FIC_101.PV", "FIC_102.PV"],
        "x": 0, "y": 20, "w": 8, "h": 6
    },
    {
        "id": "w_xyplot",
        "type": "xy_plot",
        "title": "Operating Scatter Cross-Plot (Pressure vs Reflux)",
        "tags": ["PIC_101.PV", "FIC_102.PV"],
        "x": 8, "y": 20, "w": 4, "h": 6
    },

    # Row 26 (MT Anomaly + Correlation Matrix)
    {
        "id": "w_mt",
        "type": "mt_anomaly",
        "title": "Mahalanobis-Taguchi Multivariate Anomaly Radar",
        "tags": ["AHI_C101.MT_DIST", "AHI_C101.HEALTH"],
        "x": 0, "y": 26, "w": 6, "h": 6
    },
    {
        "id": "w_correl",
        "type": "correlation_matrix",
        "title": "Pearson Cross-Variable Correlation Heatmap",
        "tags": ["TIC_101.PV", "TIC_102.PV", "PIC_101.PV", "FIC_101.PV"],
        "x": 6, "y": 26, "w": 6, "h": 6
    },

    # Row 32 (Floor Heatmap + State Timeline)
    {
        "id": "w_floor",
        "type": "floor_heatmap",
        "title": "Furnace Deck Spatial Thermal Heat Map",
        "tags": ["TIC_101.PV", "TIC_102.PV"],
        "x": 0, "y": 32, "w": 6, "h": 6
    },
    {
        "id": "w_states",
        "type": "state_timeline",
        "title": "Pump Fleet Discrete State Timeline",
        "tags": [],
        "x": 6, "y": 32, "w": 6, "h": 6
    },

    # Row 38 (Datatable + Asset List)
    {
        "id": "w_datatable",
        "type": "datatable",
        "title": "Multi-Tag Live Telemetry & Historical Table",
        "tags": ["TIC_101.PV", "TIC_102.PV", "PIC_101.PV", "FIC_101.PV", "VDU_TIC_201.PV", "FCC_TIC_301.PV"],
        "x": 0, "y": 38, "w": 7, "h": 6
    },
    {
        "id": "w_assetlist",
        "type": "asset_list",
        "title": "Refinery Equipment Fleet & RUL Inventory",
        "tags": [],
        "x": 7, "y": 38, "w": 5, "h": 6
    },

    # Row 44 (Command Station + 3D Model + Folding Panel)
    {
        "id": "w_command",
        "type": "command",
        "title": "CENTUM VP DCS Setpoint Controller Station",
        "tags": ["TIC_101.SV"],
        "targetDevice": "CENTUM_VP_FCS01",
        "defaultSV": 120,
        "unit": "°C",
        "x": 0, "y": 44, "w": 4, "h": 5
    },
    {
        "id": "w_3d",
        "type": "3d_model",
        "title": "Column C-101 3D CAD Digital Twin & Pins",
        "tags": ["TIC_101.PV"],
        "x": 4, "y": 44, "w": 4, "h": 5
    },
    {
        "id": "w_folding",
        "type": "folding",
        "title": "Subsystem Accordion Folding Monitor",
        "tags": [],
        "x": 8, "y": 44, "w": 4, "h": 5
    },

    # Row 49 (Custom ECharts Script + Navigator)
    {
        "id": "w_echarts_script",
        "type": "echart_script",
        "title": "Custom ECharts: Column Thermal ΔT & Covariance",
        "tags": ["TIC_101.PV", "TIC_102.PV"],
        "customScript": """const top = Number(context.liveTelemetry['TIC_101.PV']?.value || 118);
const bot = Number(context.liveTelemetry['TIC_102.PV']?.value || 235);
const deltaT = (bot - top).toFixed(1);
const mt = Number(context.liveTelemetry['AHI_C101.MT_DIST']?.value || 1.18);

return {
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis' },
  grid: { left: '8%', right: '8%', top: '20%', bottom: '20%' },
  xAxis: {
    type: 'category',
    data: ['TIC-101 Top', 'TIC-102 Bot', 'Column ΔT', 'MT-Dist x50'],
    axisLabel: { color: '#94a3b8', fontSize: 10 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    axisLabel: { color: '#64748b', fontSize: 10 }
  },
  series: [{
    type: 'bar',
    barWidth: 28,
    data: [
      { value: top, itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] } },
      { value: bot, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
      { value: Number(deltaT), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
      { value: Number((mt * 50).toFixed(1)), itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] } }
    ],
    label: { show: true, position: 'top', color: '#fff', fontWeight: 'bold' }
  }]
};""",
        "x": 0, "y": 49, "w": 6, "h": 5
    },
    {
        "id": "w_navigator",
        "type": "navigator",
        "title": "Direct Operational Navigation",
        "targetDashboard": "refinery-cdu-overview",
        "buttonText": "Open CDU C-101 Distillation View",
        "accentColor": "#0284c7",
        "x": 6, "y": 49, "w": 6, "h": 5
    },

    # Row 54 (ISA-18.2 Alarms Banner across all 12 columns)
    {
        "id": "w_alarms",
        "type": "alarms",
        "title": "ISA-18.2 Plant-Wide Active Alarms & Event Journal",
        "tags": [],
        "x": 0, "y": 54, "w": 12, "h": 5
    }
]

showcase_data = {
    "title": "All Widgets Master Showcase",
    "slug": "all-widgets-master-showcase",
    "description": "Comprehensive live operational dashboard exhibiting all 24+ industrial widgets (including single-tag capacity donut, multi-tag ratio, trends, synoptics, gauges, and tables) working seamlessly with live telemetry.",
    "category": "Master Showcase",
    "time_range": "now-15m",
    "refresh_interval": "1s",
    "layout": showcase_layout
}

try:
    # Check if showcase already exists
    req_check = urllib.request.Request(f"{API_BASE}/dashboards/all-widgets-master-showcase")
    exists = False
    try:
        with urllib.request.urlopen(req_check) as check_res:
            exists = True
    except urllib.error.HTTPError as he:
        if he.code == 404:
            exists = False

    if exists:
        print("Showcase exists, updating...")
        req = urllib.request.Request(
            f"{API_BASE}/dashboards/all-widgets-master-showcase",
            data=json.dumps(showcase_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PUT'
        )
    else:
        print("Showcase does not exist, creating...")
        req = urllib.request.Request(
            f"{API_BASE}/dashboards",
            data=json.dumps(showcase_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

    with urllib.request.urlopen(req) as res:
        print("Showcase dashboard response:", res.read().decode())
except Exception as e:
    print("Error creating/updating showcase dashboard:", e)
