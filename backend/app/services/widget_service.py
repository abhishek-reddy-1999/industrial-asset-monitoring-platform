"""
widget_service.py - Comprehensive Industrial Widget Registry & Studio Engine
Implements the full widget ecosystem for the Industrial Intelligence Platform:
- 38+ Built-in Industrial & IoT Widget Types
- Categorization, Bundling, Configuration & Data Schemas
- Lifecycle Management, Versioning, Permissions & Action Handling
- Import/Export Package Management (ThingsBoard PE & Grafana interoperable)
"""

import json
import os
import uuid
import time
import datetime
from typing import Dict, List, Any, Optional

WIDGET_CATEGORIES = [
    {"id": "trends", "name": "Trends & Time Series", "icon": "Activity", "description": "High-density temporal graphs, area charts, histograms and multi-pen trendlines."},
    {"id": "gauges", "name": "Gauges & Dials", "icon": "Gauge", "description": "Radial Bourdon dials, linear columns, circular levels and speedometer meters."},
    {"id": "cards", "name": "KPIs & Status Cards", "icon": "LayoutGrid", "description": "Digital single-stats, multi-metric KPI containers, entity profile and alarm cards."},
    {"id": "tables", "name": "Tables & Grids", "icon": "Table", "description": "Live telemetry datatables, ISA-95 asset hierarchy lists and ISA-18.2 alarm event matrices."},
    {"id": "controls", "name": "Controls & RPC", "icon": "Sliders", "description": "Bidirectional switches, push buttons, rotary setpoint knobs and actuator sliders."},
    {"id": "process", "name": "Process & SCADA", "icon": "Component", "description": "Animated vessels, centrifugal pumps, electric motors, control valves and GIS maps."},
    {"id": "analytics", "name": "Advanced Analytics & SPC", "icon": "Cpu", "description": "FFT vibration spectrums, Pareto charts, Waterfall mass balance and Shewhart SPC control charts."},
    {"id": "markup", "name": "Markup & Media", "icon": "FileText", "description": "Rich headers, markdown runbooks, sanitized HTML containers and media players."}
]

WIDGET_BUNDLES = [
    {"id": "LATEST_VALUES", "title": "Latest Values & Gauges", "description": "Instant telemetry readouts, Bourdon dials and digital meters."},
    {"id": "TIME_SERIES", "title": "Time Series Charts", "description": "Historical and real-time trendlines with LTTB downsampling."},
    {"id": "CONTROL_WIDGETS", "title": "Control & RPC Widgets", "description": "Bidirectional plant floor control and actuator actuators."},
    {"id": "ALARM_WIDGETS", "title": "Alarm & Safety Widgets", "description": "ISA-18.2 alarm consoles, trip banners and priority tables."},
    {"id": "SCADA_SYNOPTIC", "title": "Industrial SCADA Mimic", "description": "P&ID equipment silhouettes, animated pumps, tanks and valves."},
    {"id": "ANALYTICS_SPC", "title": "APM & Quality Analytics", "description": "Mahalanobis-Taguchi radar, FFT spectrum, Pareto and SPC control charts."},
    {"id": "TABLES_CARDS", "title": "Tables & Entity Cards", "description": "Tabular grids, asset metadata cards and state transition timelines."}
]

# The definitive 38+ widget type definitions
WIDGET_TYPE_DEFINITIONS: List[Dict[str, Any]] = [
    # 1. Trends & Charts
    {
        "type": "timeseries",
        "title": "Time Series Chart",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "Multi-pen plant historian trendline with live WebSocket downsampling, zoom, pan and threshold lines.",
        "icon": "Activity",
        "supportedTags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV"],
        "defaultProps": {"smooth": True, "showLegend": True, "showGrid": True, "timeWindow": "15m", "fillArea": False}
    },
    {
        "type": "area_chart",
        "title": "Area Chart",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "Gradient shaded area chart showing volume, cumulative throughput and process envelopes.",
        "icon": "Layers",
        "supportedTags": ["FIC_101.PV", "FIC_102.PV"],
        "defaultProps": {"opacity": 0.45, "gradient": True, "stacked": False}
    },
    {
        "type": "bar_chart",
        "title": "Bar Chart",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "Categorical or temporal discrete bars for comparing shift throughput, fuel rates and batch yields.",
        "icon": "BarChart3",
        "supportedTags": ["FIC_101.PV"],
        "defaultProps": {"barWidth": "45%", "showValues": True, "horizontal": False}
    },
    {
        "type": "pie_chart",
        "title": "Pie Chart",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 4, "defaultH": 5,
        "description": "Proportional mass balance and operational distribution chart.",
        "icon": "PieChart",
        "supportedTags": ["FIC_101.PV", "FIC_102.PV"],
        "defaultProps": {"showLabels": True, "roseType": False}
    },
    {
        "type": "donut_chart",
        "title": "Donut Chart",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 4, "defaultH": 5,
        "description": "Modern hollow ring chart with center KPI readout and percentage breakdown.",
        "icon": "Disc",
        "supportedTags": ["FIC_101.PV", "FIC_102.PV"],
        "defaultProps": {"innerRadius": "55%", "outerRadius": "80%", "centerSummary": True}
    },
    {
        "type": "scatter_plot",
        "title": "Scatter Plot (XY Correlation)",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "Correlates two process variables (e.g. Column Temperature vs Pressure) to reveal operating regimes.",
        "icon": "GitFork",
        "supportedTags": ["TIC_101.PV", "PIC_101.PV"],
        "defaultProps": {"pointSize": 6, "trendline": True}
    },
    {
        "type": "heatmap",
        "title": "Process Heatmap",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "2D matrix of time intervals vs equipment nodes highlighting temperature spikes and operating outliers.",
        "icon": "Grid",
        "supportedTags": ["TIC_101.PV", "TIC_102.PV"],
        "defaultProps": {"colorScale": "viridis", "cellSize": 20}
    },
    {
        "type": "histogram",
        "title": "Histogram",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": False,
        "defaultW": 6, "defaultH": 5,
        "description": "Statistical frequency distribution grouping telemetry measurements into dynamic bins.",
        "icon": "BarChart2",
        "supportedTags": ["TIC_101.PV"],
        "defaultProps": {"bins": 15, "showNormalCurve": True}
    },
    {
        "type": "box_plot",
        "title": "Box Plot (Quartile Distribution)",
        "category": "trends",
        "bundle": "TIME_SERIES",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "Statistical five-number summary displaying median, IQR, quartiles and process outlier dots.",
        "icon": "Box",
        "supportedTags": ["TIC_101.PV", "PIC_101.PV"],
        "defaultProps": {"showOutliers": True}
    },

    # 2. Gauges & Dials
    {
        "type": "gauge",
        "title": "Speedometer Dial Gauge",
        "category": "gauges",
        "bundle": "LATEST_VALUES",
        "multiTag": False,
        "defaultW": 4, "defaultH": 5,
        "description": "180-degree circular dial gauge with ISA-18.2 Normal, Warning and High alarm colored sectors.",
        "icon": "Gauge",
        "supportedTags": ["TIC_101.PV"],
        "defaultProps": {"min": 0, "max": 250, "unit": "°C", "warn": 180, "crit": 210}
    },
    {
        "type": "radial_gauge",
        "title": "Radial Bourdon Gauge",
        "category": "gauges",
        "bundle": "LATEST_VALUES",
        "multiTag": False,
        "defaultW": 4, "defaultH": 5,
        "description": "Industrial 270-degree mechanical pressure dial with Bourdon needle, tick graduation and center glass.",
        "icon": "RotateCw",
        "supportedTags": ["PIC_101.PV"],
        "defaultProps": {"min": 0, "max": 400, "unit": "kPa", "warn": 250, "crit": 320}
    },
    {
        "type": "linear_gauge",
        "title": "Linear Column Gauge",
        "category": "gauges",
        "bundle": "LATEST_VALUES",
        "multiTag": False,
        "defaultW": 3, "defaultH": 5,
        "description": "Vertical thermometer mercury column or horizontal bar gauge with threshold limit notches.",
        "icon": "SlidersHorizontal",
        "supportedTags": ["LIC_101.PV"],
        "defaultProps": {"orientation": "vertical", "min": 0, "max": 100, "unit": "%"}
    },

    # 3. KPIs & Status Cards
    {
        "type": "kpi_card",
        "title": "Data KPI Card",
        "category": "cards",
        "bundle": "LATEST_VALUES",
        "multiTag": False,
        "defaultW": 3, "defaultH": 3,
        "description": "High-impact single metric card with primary value, unit, delta change indicator and mini sparkline.",
        "icon": "Sparkles",
        "supportedTags": ["TIC_101.PV"],
        "defaultProps": {"unit": "°C", "showSparkline": True, "showDelta": True}
    },
    {
        "type": "status_card",
        "title": "Equipment Status Card",
        "category": "cards",
        "bundle": "LATEST_VALUES",
        "multiTag": False,
        "defaultW": 3, "defaultH": 3,
        "description": "Discrete machine state indicator: RUNNING, STOPPED, TRIPPED, MAINTENANCE with animated glowing status pill.",
        "icon": "CheckCircle2",
        "supportedTags": ["MTR_101.RUN"],
        "defaultProps": {"stateMap": {"0": "STOPPED", "1": "RUNNING"}}
    },
    {
        "type": "entity_card",
        "title": "Asset Profile Entity Card",
        "category": "cards",
        "bundle": "TABLES_CARDS",
        "multiTag": False,
        "defaultW": 4, "defaultH": 4,
        "description": "Asset summary badge displaying equipment name, model, serial number, health score and operating status.",
        "icon": "FolderTree",
        "supportedTags": ["AHI_C101.HEALTH"],
        "defaultProps": {"entityName": "Crude Distillation Column C-101", "model": "Yokogawa AHI Certified"}
    },
    {
        "type": "alarm_card",
        "title": "Active Alarm Callout Card",
        "category": "cards",
        "bundle": "ALARM_WIDGETS",
        "multiTag": False,
        "defaultW": 4, "defaultH": 3,
        "description": "Urgent alarm card flashing with ISA-18.2 severity, elapsed duration, trip value and Ack button.",
        "icon": "AlertTriangle",
        "supportedTags": ["PIC_101.PV"],
        "defaultProps": {"severity": "CRITICAL", "message": "Column Top High High Pressure Exceeded"}
    },

    # 4. Tables & Grids
    {
        "type": "data_table",
        "title": "Process Telemetry Datatable",
        "category": "tables",
        "bundle": "TABLES_CARDS",
        "multiTag": True,
        "defaultW": 8, "defaultH": 6,
        "description": "Tabular real-time stream of all bound tags with timestamp, value, units, quality flag and sorting.",
        "icon": "Table",
        "supportedTags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV", "LIC_101.PV"],
        "defaultProps": {"pageSize": 10, "showSearch": True, "exportCsv": True}
    },
    {
        "type": "entity_table",
        "title": "Asset Hierarchy Table",
        "category": "tables",
        "bundle": "TABLES_CARDS",
        "multiTag": False,
        "defaultW": 6, "defaultH": 5,
        "description": "ISA-95 tree table showing Enterprise, Site, Area and Unit health metrics and online sensor counts.",
        "icon": "ListTree",
        "supportedTags": [],
        "defaultProps": {"level": "UNIT"}
    },
    {
        "type": "alarm_table",
        "title": "ISA-18.2 Alarm Event Matrix",
        "category": "tables",
        "bundle": "ALARM_WIDGETS",
        "multiTag": False,
        "defaultW": 10, "defaultH": 5,
        "description": "Standard industrial alarm table with active status filters, severity coloring and batch Acknowledge.",
        "icon": "ShieldAlert",
        "supportedTags": [],
        "defaultProps": {"filterStatus": "ACTIVE_UNACK", "autoRefresh": True}
    },
    {
        "type": "state_timeline",
        "title": "State Timeline Gantt",
        "category": "tables",
        "bundle": "TABLES_CARDS",
        "multiTag": False,
        "defaultW": 8, "defaultH": 4,
        "description": "Gantt-style horizontal timeline displaying sequence of discrete equipment operating states over 24h.",
        "icon": "Calendar",
        "supportedTags": ["MTR_101.RUN"],
        "defaultProps": {"timeWindow": "8h"}
    },
    {
        "type": "status_history",
        "title": "Status History Strip",
        "category": "tables",
        "bundle": "TABLES_CARDS",
        "multiTag": True,
        "defaultW": 8, "defaultH": 4,
        "description": "Color-coded horizontal event bars detailing online/offline communication quality and duty cycle.",
        "icon": "Clock",
        "supportedTags": ["XV_101.STATUS"],
        "defaultProps": {"showTimestampTicks": True}
    },

    # 5. Process & SCADA Symbols
    {
        "type": "tank",
        "title": "Industrial Tank Vessel",
        "category": "process",
        "bundle": "SCADA_SYNOPTIC",
        "multiTag": False,
        "defaultW": 4, "defaultH": 6,
        "description": "Calibrated storage vessel with animated fluid wave level, ullage volume and high level trip marker.",
        "icon": "Droplets",
        "supportedTags": ["LIC_101.PV"],
        "defaultProps": {"min": 0, "max": 100, "capacityLiters": 25000, "liquidColor": "#0ea5e9"}
    },
    {
        "type": "pump",
        "title": "Centrifugal Pump Indicator",
        "category": "process",
        "bundle": "SCADA_SYNOPTIC",
        "multiTag": False,
        "defaultW": 3, "defaultH": 4,
        "description": "Standard P&ID pump symbol with rotating impeller animation when running, tripped badge and RPC start/stop.",
        "icon": "RotateCw",
        "supportedTags": ["MTR_101.RUN"],
        "defaultProps": {"pumpId": "P-101A", "flowRateTag": "FIC_101.PV"}
    },
    {
        "type": "motor",
        "title": "Electric Motor Drive",
        "category": "process",
        "bundle": "SCADA_SYNOPTIC",
        "multiTag": False,
        "defaultW": 3, "defaultH": 4,
        "description": "Heavy-duty 3-phase induction motor silhouette with speed RPM, winding temp and bearing vibration.",
        "icon": "Cpu",
        "supportedTags": ["MTR_101.RUN"],
        "defaultProps": {"ratedRpm": 2950, "vibrationTag": "VIB_101.RMS"}
    },
    {
        "type": "valve",
        "title": "Pneumatic Control Valve",
        "category": "process",
        "bundle": "SCADA_SYNOPTIC",
        "multiTag": False,
        "defaultW": 3, "defaultH": 4,
        "description": "Diaphragm actuator control valve displaying percentage opening (0-100%), fail-safe state and manual override.",
        "icon": "GitCommit",
        "supportedTags": ["FIC_101.MV"],
        "defaultProps": {"valveTag": "FCV-101", "failAction": "FAIL_CLOSED"}
    },
    {
        "type": "map",
        "title": "Plant GIS Geographic Map",
        "category": "process",
        "bundle": "SCADA_SYNOPTIC",
        "multiTag": False,
        "defaultW": 8, "defaultH": 6,
        "description": "Interactive geospatial map overlaying refinery units, tank farms, GPS equipment trackers and incident pins.",
        "icon": "MapPin",
        "supportedTags": [],
        "defaultProps": {"lat": 34.502, "lng": 133.748, "zoom": 15}
    },
    {
        "type": "image_map",
        "title": "P&ID Graphic Image Map",
        "category": "process",
        "bundle": "SCADA_SYNOPTIC",
        "multiTag": True,
        "defaultW": 8, "defaultH": 6,
        "description": "Process diagram background with clickable hot-spots and real-time live sensor callout badges.",
        "icon": "Image",
        "supportedTags": ["TIC_101.PV", "PIC_101.PV", "LIC_101.PV"],
        "defaultProps": {"imageSrc": "/assets/pid_mimic.svg"}
    },

    # 6. Controls & RPC
    {
        "type": "button",
        "title": "Momentary / Latch Push Button",
        "category": "controls",
        "bundle": "CONTROL_WIDGETS",
        "multiTag": False,
        "defaultW": 3, "defaultH": 3,
        "description": "Industrial push button for triggering remote digital commands, ESD resets and batch starts.",
        "icon": "Power",
        "supportedTags": ["MTR_101.RUN"],
        "defaultProps": {"label": "EMERGENCY RESET", "rpcMethod": "resetEsd", "confirmPrompt": True}
    },
    {
        "type": "switch",
        "title": "2-State Toggle Switch",
        "category": "controls",
        "bundle": "CONTROL_WIDGETS",
        "multiTag": False,
        "defaultW": 3, "defaultH": 3,
        "description": "Bistable industrial rocker switch transmitting RPC commands to energize relays or start motors.",
        "icon": "ToggleRight",
        "supportedTags": ["MTR_101.RUN"],
        "defaultProps": {"onLabel": "START", "offLabel": "STOP", "rpcMethod": "togglePump"}
    },
    {
        "type": "slider",
        "title": "Actuator Output Slider",
        "category": "controls",
        "bundle": "CONTROL_WIDGETS",
        "multiTag": False,
        "defaultW": 5, "defaultH": 4,
        "description": "Continuous analog output slider (0 to 100%) for valve positioning and VFD frequency trim.",
        "icon": "Sliders",
        "supportedTags": ["FIC_101.MV"],
        "defaultProps": {"min": 0, "max": 100, "unit": "%", "rpcMethod": "setActuator"}
    },
    {
        "type": "setpoint",
        "title": "Rotary Setpoint Knob (SV)",
        "category": "controls",
        "bundle": "CONTROL_WIDGETS",
        "multiTag": False,
        "defaultW": 4, "defaultH": 4,
        "description": "Precision digital rotary dial with increment/decrement buttons and confirmation dialog for loop SV tuning.",
        "icon": "Compass",
        "supportedTags": ["TIC_101.SV"],
        "defaultProps": {"min": 100, "max": 250, "step": 1.0, "unit": "°C", "rpcMethod": "setPoint"}
    },

    # 7. Advanced Analytics & SPC
    {
        "type": "fft_chart",
        "title": "Fast Fourier Transform (FFT) Analyzer",
        "category": "analytics",
        "bundle": "ANALYTICS_SPC",
        "multiTag": False,
        "defaultW": 6, "defaultH": 5,
        "description": "Decomposes time-domain vibration waveform into frequency spectrum harmonics (0 to 5000 Hz).",
        "icon": "Activity",
        "supportedTags": ["VIB_101.RMS"],
        "defaultProps": {"samplingRate": 10000, "maxFreq": 2000, "window": "Hanning"}
    },
    {
        "type": "vibration_spectrum",
        "title": "ISO 10816 Vibration Spectrum",
        "category": "analytics",
        "bundle": "ANALYTICS_SPC",
        "multiTag": False,
        "defaultW": 6, "defaultH": 5,
        "description": "Machinery vibration spectrum with ISO 10816 Zone A (Good), B (Acceptable), C (Warning), D (Danger) masks.",
        "icon": "Radio",
        "supportedTags": ["VIB_101.RMS"],
        "defaultProps": {"isoClass": "Class II (Medium Machines)", "runningSpeedRpm": 2950}
    },
    {
        "type": "waterfall_chart",
        "title": "Waterfall Balance Chart",
        "category": "analytics",
        "bundle": "ANALYTICS_SPC",
        "multiTag": True,
        "defaultW": 6, "defaultH": 5,
        "description": "Sequential positive and negative contribution chart showing refinery mass balance gains and thermal losses.",
        "icon": "TrendingDown",
        "supportedTags": ["FIC_101.PV", "FIC_102.PV"],
        "defaultProps": {"showTotals": True}
    },
    {
        "type": "pareto_chart",
        "title": "Pareto 80/20 Alarm Analysis",
        "category": "analytics",
        "bundle": "ANALYTICS_SPC",
        "multiTag": False,
        "defaultW": 6, "defaultH": 5,
        "description": "Dual-axis chart displaying descending frequency of equipment alarms alongside cumulative percentage curve.",
        "icon": "BarChart",
        "supportedTags": [],
        "defaultProps": {"topN": 10, "thresholdPct": 80}
    },
    {
        "type": "control_chart",
        "title": "Statistical Process Control (Shewhart)",
        "category": "analytics",
        "bundle": "ANALYTICS_SPC",
        "multiTag": False,
        "defaultW": 8, "defaultH": 5,
        "description": "Shewhart X-bar control chart with Center Line (CL), Upper Control Limit (UCL), LCL and Western Electric alarm rules.",
        "icon": "TrendingUp",
        "supportedTags": ["TIC_101.PV"],
        "defaultProps": {"cl": 118.4, "ucl": 128.0, "lcl": 108.8, "rulesEnabled": True}
    },

    # 8. Markup & Content
    {
        "type": "text",
        "title": "Rich Heading & Callout",
        "category": "markup",
        "bundle": "STATIC_MARKUP",
        "multiTag": False,
        "defaultW": 4, "defaultH": 2,
        "description": "Industrial section banner, unit tag subtitle and shift operational guidance header.",
        "icon": "Type",
        "supportedTags": [],
        "defaultProps": {"text": "CRUDE DISTILLATION PRIMARY TRAIN (CDU-101)", "fontSize": 18, "color": "#38bdf8"}
    },
    {
        "type": "markdown",
        "title": "Markdown Standard Operating Procedure",
        "category": "markup",
        "bundle": "STATIC_MARKUP",
        "multiTag": False,
        "defaultW": 4, "defaultH": 4,
        "description": "Formatted Markdown reader for plant operating procedures, shift handover logs and safety instructions.",
        "icon": "FileText",
        "supportedTags": [],
        "defaultProps": {"content": "### Shift Handover SOP\n1. Verify Reflux Drum level `LIC-101.PV` >= 55%.\n2. Ensure Charge Pump `P-101A` vibration < 2.5 mm/s."}
    },
    {
        "type": "html",
        "title": "Custom HTML / SVG Container",
        "category": "markup",
        "bundle": "STATIC_MARKUP",
        "multiTag": False,
        "defaultW": 4, "defaultH": 4,
        "description": "Sanitized custom HTML layout container with scoped styling and responsive viewport fitting.",
        "icon": "Code",
        "supportedTags": [],
        "defaultProps": {"html": "<div style='padding:12px; border-left:4px solid #38bdf8;'><b>SIL-3 SIS INTERLOCK HEALTHY</b></div>"}
    }
]


class WidgetStudioEngine:
    """Enterprise Widget Studio state manager and catalog registry."""
    def __init__(self):
        self.state_file = os.path.join(os.path.dirname(__file__), "..", "..", "widget_studio_state.json")
        self.custom_widgets: List[Dict[str, Any]] = []
        self.widget_library: List[Dict[str, Any]] = []
        self._load_or_seed_library()

    def _load_or_seed_library(self):
        """Loads persistent custom widgets or seeds initial library."""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.custom_widgets = data.get("custom_widgets", [])
            except Exception as e:
                print(f"[WidgetEngine] Warning: Could not read state file: {e}")

        # Build combined runtime library
        self._rebuild_runtime_library()

    def _save_state(self):
        """Persists custom widgets and configuration state."""
        try:
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump({"custom_widgets": self.custom_widgets, "updated_at": time.time()}, f, indent=2)
        except Exception as e:
            print(f"[WidgetEngine] Warning: Could not write state file: {e}")

    def _rebuild_runtime_library(self):
        """Combines built-in standard widgets with custom user widgets."""
        combined = []
        # 1. Built-in widgets
        for w_def in WIDGET_TYPE_DEFINITIONS:
            w_id = f"w-builtin-{w_def['type']}"
            combined.append({
                "id": w_id,
                "type": w_def["type"],
                "title": w_def["title"],
                "category": w_def["category"],
                "bundle": w_def["bundle"],
                "version": "1.0.0",
                "status": "PUBLISHED",
                "isBuiltin": True,
                "author": "Yokogawa Industrial Intelligence Core",
                "description": w_def["description"],
                "icon": w_def["icon"],
                "multiTag": w_def.get("multiTag", False),
                "defaultW": w_def.get("defaultW", 6),
                "defaultH": w_def.get("defaultH", 5),
                "tags": w_def.get("supportedTags", []),
                "properties": w_def.get("defaultProps", {}),
                "createdTime": 1775800000000,
                "permissions": {"read": True, "write": False, "delete": False}
            })

        # 2. Custom widgets
        for cw in self.custom_widgets:
            combined.append(cw)

        self.widget_library = combined

    def list_widgets(self, category: Optional[str] = None, bundle: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """Filters widgets by category, bundle, and text search."""
        results = self.widget_library
        if category and category != "ALL":
            results = [w for w in results if w.get("category") == category]
        if bundle and bundle != "ALL":
            results = [w for w in results if w.get("bundle") == bundle]
        if search:
            q = search.lower().strip()
            results = [w for w in results if q in w.get("title", "").lower() or q in w.get("type", "").lower() or q in w.get("description", "").lower()]
        return results

    def get_widget_by_id(self, widget_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a specific widget by ID."""
        for w in self.widget_library:
            if w.get("id") == widget_id:
                return w
        return None

    def create_widget(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new custom widget template."""
        w_id = payload.get("id") or f"w-custom-{uuid.uuid4().hex[:6]}"
        new_widget = {
            "id": w_id,
            "type": payload.get("type", "timeseries"),
            "title": payload.get("title", "New Industrial Widget"),
            "category": payload.get("category", "trends"),
            "bundle": payload.get("bundle", "TIME_SERIES"),
            "version": payload.get("version", "1.0.0"),
            "status": payload.get("status", "DRAFT"),
            "isBuiltin": False,
            "author": payload.get("author", "Plant Operations Engineer"),
            "description": payload.get("description", "Custom user-configured industrial widget template."),
            "icon": payload.get("icon", "Sparkles"),
            "multiTag": payload.get("multiTag", False),
            "defaultW": payload.get("defaultW", 6),
            "defaultH": payload.get("defaultH", 5),
            "tags": payload.get("tags", ["TIC_101.PV"]),
            "properties": payload.get("properties", {}),
            "style": payload.get("style", {"theme": "dark_industrial", "cardStyle": "glass"}),
            "actions": payload.get("actions", {}),
            "customScript": payload.get("customScript", ""),
            "createdTime": int(time.time() * 1000),
            "permissions": {"read": True, "write": True, "delete": True}
        }
        self.custom_widgets.append(new_widget)
        self._rebuild_runtime_library()
        self._save_state()
        return new_widget

    def update_widget(self, widget_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates an existing custom widget."""
        for idx, cw in enumerate(self.custom_widgets):
            if cw["id"] == widget_id:
                payload["id"] = widget_id
                payload["isBuiltin"] = False
                payload["updatedTime"] = int(time.time() * 1000)
                self.custom_widgets[idx].update(payload)
                self._rebuild_runtime_library()
                self._save_state()
                return self.custom_widgets[idx]
        return None

    def delete_widget(self, widget_id: str) -> bool:
        """Deletes a custom widget."""
        init_len = len(self.custom_widgets)
        self.custom_widgets = [cw for cw in self.custom_widgets if cw["id"] != widget_id]
        if len(self.custom_widgets) < init_len:
            self._rebuild_runtime_library()
            self._save_state()
            return True
        return False

    def publish_widget(self, widget_id: str, new_version: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Transitions a widget status from DRAFT to PUBLISHED."""
        for cw in self.custom_widgets:
            if cw["id"] == widget_id:
                cw["status"] = "PUBLISHED"
                if new_version:
                    cw["version"] = new_version
                self._rebuild_runtime_library()
                self._save_state()
                return cw
        return None

    def export_package(self, widget_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Packages widgets into a portable JSON bundle."""
        targets = self.widget_library if not widget_ids else [w for w in self.widget_library if w["id"] in widget_ids]
        return {
            "format": "INDUSTRIAL_WIDGET_PACKAGE_V2",
            "exportedAt": datetime.datetime.utcnow().isoformat(),
            "generator": "Yokogawa OpreX Industrial Intelligence Platform",
            "widgetsCount": len(targets),
            "widgets": targets
        }

    def import_package(self, package_data: Dict[str, Any]) -> Dict[str, Any]:
        """Imports an industrial widget package."""
        widgets = package_data.get("widgets", [])
        imported_count = 0
        for w in widgets:
            w_id = w.get("id") or f"w-import-{uuid.uuid4().hex[:6]}"
            # Ensure not overwriting built-in
            if w.get("isBuiltin", False):
                w_id = f"w-import-{w.get('type')}-{uuid.uuid4().hex[:4]}"
            w["id"] = w_id
            w["isBuiltin"] = False
            w["importedAt"] = int(time.time() * 1000)
            
            # replace or append
            idx = next((i for i, existing in enumerate(self.custom_widgets) if existing["id"] == w_id), -1)
            if idx >= 0:
                self.custom_widgets[idx] = w
            else:
                self.custom_widgets.append(w)
            imported_count += 1

        self._rebuild_runtime_library()
        self._save_state()
        return {"imported": imported_count, "total_custom_widgets": len(self.custom_widgets)}


# Global Singleton Instance
widget_engine = WidgetStudioEngine()
