import React, { useState, useMemo } from 'react';
import { 
  X, Search, Plus, Activity, Gauge, Map as MapIcon, ShieldAlert, 
  Table, Sliders, Code, Layers, FileSpreadsheet,
  PieChart, GitMerge, BarChart3, Compass, 
  Terminal, Image, Calendar, Eye, Grid3X3, Folder, ListTree, Check,
  Filter, Tag, Database, Zap, RefreshCw, ChevronRight, Sparkles, CheckCircle2
} from 'lucide-react';

// ============================================================================
// 1. COMPREHENSIVE YOKOGAWA OPREX AHI WIDGET CATALOG
// ============================================================================
export const WIDGET_CATALOG = [
  // Trends & Time Series
  {
    id: 'timeseries',
    title: 'Time Series Chart',
    category: 'trends',
    categoryLabel: 'Trends & Time Series',
    multiTag: true,
    defaultW: 6, defaultH: 5,
    desc: 'Interactive plant historian trend chart with multi-tag line, bar, area, zoom & pan capabilities.',
    icon: <Activity size={20} color="#38bdf8" />
  },
  {
    id: 'timeseries_v2',
    title: 'Time Series Chart v2',
    category: 'trends',
    categoryLabel: 'Trends & Time Series',
    multiTag: true,
    defaultW: 6, defaultH: 5,
    desc: 'Enhanced time-series chart with step interpolation, dynamic threshold bands, and live cursor readout.',
    icon: <Activity size={20} color="#38bdf8" />
  },
  {
    id: 'barchart',
    title: 'Bar Chart',
    category: 'trends',
    categoryLabel: 'Trends & Time Series',
    multiTag: true,
    defaultW: 6, defaultH: 5,
    desc: 'Bar chart for pattern and profile comparison, with sortable bars and customizable loop colors.',
    icon: <BarChart3 size={20} color="#38bdf8" />
  },
  {
    id: 'histogram',
    title: 'Analytic Histogram Chart',
    category: 'trends',
    categoryLabel: 'Trends & Time Series',
    multiTag: true,
    defaultW: 6, defaultH: 5,
    desc: 'Statistical frequency distribution of process values grouped into dynamic data bins.',
    icon: <BarChart3 size={20} color="#38bdf8" />
  },
  {
    id: 'xy_plot',
    title: 'XY Scatter Plot',
    category: 'trends',
    categoryLabel: 'Trends & Time Series',
    multiTag: true,
    defaultW: 6, defaultH: 5,
    desc: 'Dual-variable scatter plot correlating process parameters (e.g. Pressure vs Column Reflux).',
    icon: <GitMerge size={20} color="#38bdf8" />
  },
  {
    id: 'state_timeline',
    title: 'State Timelines Chart',
    category: 'trends',
    categoryLabel: 'Trends & Time Series',
    multiTag: false,
    defaultW: 6, defaultH: 5,
    desc: 'Visualizes discrete equipment states (Running, Stopped, Tripped, Maintenance) over time.',
    icon: <Calendar size={20} color="#38bdf8" />
  },

  // Gauges & KPIs
  {
    id: 'gauge',
    title: 'Radial Gauge Chart',
    category: 'gauges',
    categoryLabel: 'Gauges & KPIs',
    multiTag: false,
    defaultW: 4, defaultH: 5,
    desc: 'Industrial dial speedometer gauge with ISA-18.2 Normal, Warning, and Alarm colored arcs.',
    icon: <Gauge size={20} color="#38bdf8" />
  },
  {
    id: 'singlestat',
    title: 'Data KPI / SingleStat',
    category: 'gauges',
    categoryLabel: 'Gauges & KPIs',
    multiTag: false,
    defaultW: 4, defaultH: 5,
    desc: 'Instant digital KPI display with live value, units, quality status, and alarm indicator.',
    icon: <ListTree size={20} color="#38bdf8" />
  },
  {
    id: 'card',
    title: 'Process Health Card',
    category: 'gauges',
    categoryLabel: 'Gauges & KPIs',
    multiTag: false,
    defaultW: 4, defaultH: 5,
    desc: 'Modern glassmorphic container with color-coded step ranges for asset health scores and KPIs.',
    icon: <Sliders size={20} color="#38bdf8" />
  },
  {
    id: 'bullet_graph',
    title: 'Bullet Graph',
    category: 'gauges',
    categoryLabel: 'Gauges & KPIs',
    multiTag: false,
    defaultW: 5, defaultH: 5,
    desc: 'Target benchmark graph displaying performance vs target with qualitative warning ranges.',
    icon: <Sliders size={20} color="#38bdf8" />
  },
  {
    id: 'level_circle',
    title: 'Level Circle Meter',
    category: 'gauges',
    categoryLabel: 'Gauges & KPIs',
    multiTag: false,
    defaultW: 4, defaultH: 6,
    desc: 'Animated circular tank vessel fill meter with real-time percentage and threshold coloring.',
    icon: <Activity size={20} color="#38bdf8" />
  },
  {
    id: 'dynamic_loader',
    title: 'Dynamic Ring Loader',
    category: 'gauges',
    categoryLabel: 'Gauges & KPIs',
    multiTag: false,
    defaultW: 4, defaultH: 5,
    desc: 'Dynamic rotating ring gauge comparing current process values to upper limit targets.',
    icon: <Activity size={20} color="#38bdf8" />
  },

  // Process & SCADA
  {
    id: 'digital_twin',
    title: 'ThingsBoard Digital Twin SCADA',
    category: 'process',
    categoryLabel: 'Process & SCADA',
    multiTag: true,
    defaultW: 8, defaultH: 6,
    desc: 'Interactive ThingsBoard process schematic with animated piping flow lines, rotating pumps, liquid levels, and clickable equipment inspection drawer.',
    icon: <Sparkles size={20} color="#38bdf8" />
  },
  {
    id: 'synoptic',
    title: '2D Process Synoptic Graphic',
    category: 'process',
    categoryLabel: 'Process & SCADA',
    multiTag: true,
    defaultW: 8, defaultH: 6,
    desc: 'Interactive plant P&ID synoptic diagram with live piping flows, pumps, and vessel animations.',
    icon: <MapIcon size={20} color="#38bdf8" />
  },
  {
    id: '3d_model',
    title: 'Static 3D Model Viewer',
    category: 'process',
    categoryLabel: 'Process & SCADA',
    multiTag: false,
    defaultW: 6, defaultH: 6,
    desc: '3D CAD digital twin model viewer (GLB, OBJ) with 360-degree orbit, zoom, and sensor pins.',
    icon: <Eye size={20} color="#38bdf8" />
  },
  {
    id: 'map',
    title: 'Plant GIS Map',
    category: 'process',
    categoryLabel: 'Process & SCADA',
    multiTag: false,
    defaultW: 6, defaultH: 6,
    desc: 'Geospatial facility map with GPS coordinates, equipment markers, and unit status pins.',
    icon: <MapIcon size={20} color="#38bdf8" />
  },
  {
    id: 'floor_heatmap',
    title: 'Thermal Floor Heat Map',
    category: 'process',
    categoryLabel: 'Process & SCADA',
    multiTag: true,
    defaultW: 6, defaultH: 6,
    desc: '2D spatial thermal map showing temperature gradients across refinery equipment decks.',
    icon: <Grid3X3 size={20} color="#38bdf8" />
  },
  {
    id: 'heatmap_table',
    title: 'Heatmap Matrix Table',
    category: 'process',
    categoryLabel: 'Process & SCADA',
    multiTag: true,
    defaultW: 6, defaultH: 6,
    desc: 'Tabular time-series heatmap matrix highlighting operational outliers and temperature spikes.',
    icon: <Table size={20} color="#38bdf8" />
  },

  // Tables & Alarms
  {
    id: 'datatable',
    title: 'Process Datatable',
    category: 'tables',
    categoryLabel: 'Tables & Alarms',
    multiTag: true,
    defaultW: 8, defaultH: 6,
    desc: 'High-density grid with live telemetry values, timestamp history, search, and CSV export.',
    icon: <Table size={20} color="#38bdf8" />
  },
  {
    id: 'summary_table',
    title: 'Summary Table',
    category: 'tables',
    categoryLabel: 'Tables & Alarms',
    multiTag: true,
    defaultW: 8, defaultH: 6,
    desc: 'Grouped summary table with drill-down links to detailed asset and sub-unit dashboards.',
    icon: <Table size={20} color="#38bdf8" />
  },
  {
    id: 'alarms',
    title: 'Active Alarms Banner',
    category: 'tables',
    categoryLabel: 'Tables & Alarms',
    multiTag: false,
    defaultW: 12, defaultH: 5,
    desc: 'ISA-18.2 compliant alarm console with acknowledge controls, priority levels, and siren alerts.',
    icon: <ShieldAlert size={20} color="#38bdf8" />
  },
  {
    id: 'asset_list',
    title: 'Asset Hierarchy List',
    category: 'tables',
    categoryLabel: 'Tables & Alarms',
    multiTag: false,
    defaultW: 6, defaultH: 6,
    desc: 'ISA-95 plant asset tree browser displaying unit operational statuses and active alarms.',
    icon: <ListTree size={20} color="#38bdf8" />
  },

  // Analytics & Custom
  {
    id: 'mt_anomaly',
    title: 'Mahalanobis-Taguchi Radar',
    category: 'analytics',
    categoryLabel: 'Analytics & Custom',
    multiTag: true,
    defaultW: 6, defaultH: 6,
    desc: 'Multi-axis radar profile showing Mahalanobis distance anomaly detection across process loops.',
    icon: <ShieldAlert size={20} color="#38bdf8" />
  },
  {
    id: 'sankey',
    title: 'Sankey Mass & Energy Flow',
    category: 'analytics',
    categoryLabel: 'Analytics & Custom',
    multiTag: true,
    defaultW: 8, defaultH: 6,
    desc: 'Visualizes crude distillation feed and product yield distribution across column cuts.',
    icon: <GitMerge size={20} color="#38bdf8" />
  },
  {
    id: 'piechart',
    title: 'Pie / Donut Ratio',
    category: 'analytics',
    categoryLabel: 'Analytics & Custom',
    multiTag: true,
    defaultW: 4, defaultH: 6,
    desc: 'Donut chart displaying product yield distribution and equipment availability breakdown.',
    icon: <PieChart size={20} color="#38bdf8" />
  },
  {
    id: 'correlation_matrix',
    title: 'Correlation Matrix',
    category: 'analytics',
    categoryLabel: 'Analytics & Custom',
    multiTag: true,
    defaultW: 6, defaultH: 6,
    desc: 'Pearson correlation matrix uncovering statistical dependencies between process variables.',
    icon: <Grid3X3 size={20} color="#38bdf8" />
  },
  {
    id: 'echart_script',
    title: 'Custom ECharts Script',
    category: 'analytics',
    categoryLabel: 'Analytics & Custom',
    multiTag: true,
    defaultW: 6, defaultH: 6,
    desc: 'Write custom JavaScript Apache ECharts options with direct access to live telemetry context.',
    icon: <Code size={20} color="#38bdf8" />
  },

  // ThingsBoard-Inspired Control & Alarms Console
  {
    id: 'rpc_control',
    title: 'ThingsBoard RPC Control',
    category: 'control',
    categoryLabel: 'Control & RPC',
    multiTag: false,
    defaultW: 5, defaultH: 5,
    desc: 'ThingsBoard two-way remote actuator switch, setpoint slider, and RPC command dispatch buttons.',
    icon: <Sliders size={20} color="#38bdf8" />
  },
  {
    id: 'alarms_table',
    title: 'ThingsBoard Alarms Console',
    category: 'tables',
    categoryLabel: 'Tables & Alarms',
    multiTag: false,
    defaultW: 8, defaultH: 5,
    desc: 'Embedded real-time alarms table with ISA-18.2 severity pills, state filter, and in-widget Ack & Clear controls.',
    icon: <ShieldAlert size={20} color="#ef4444" />
  }
];

export const WIDGET_CATEGORIES = [
  { id: 'ALL', label: 'All Widgets' },
  { id: 'control', label: 'Control & RPC' },
  { id: 'trends', label: 'Trends & Charts' },
  { id: 'gauges', label: 'Gauges & KPIs' },
  { id: 'process', label: 'Process & SCADA' },
  { id: 'tables', label: 'Tables & Alarms' },
  { id: 'analytics', label: 'Analytics & Custom' }
];

const FALLBACK_PLANT_TAGS = [
  { tag_name: 'FIC_101.PV', display_name: 'Crude Feed Flow Rate', eng_units: 'm³/h', current_value: 452.3, source_type: 'CENTUM_VP', min_range: 0, max_range: 800 },
  { tag_name: 'FIC_102.PV', display_name: 'Naphtha Reflux Flow', eng_units: 'm³/h', current_value: 176.4, source_type: 'CENTUM_VP', min_range: 0, max_range: 300 },
  { tag_name: 'LIC_101.PV', display_name: 'Column Sump Level', eng_units: '%', current_value: 62.1, source_type: 'CENTUM_VP', min_range: 0, max_range: 100 },
  { tag_name: 'TIC_101.PV', display_name: 'Overhead Vapor Temp', eng_units: '°C', current_value: 118.4, source_type: 'CENTUM_VP', min_range: 50, max_range: 180 },
  { tag_name: 'TIC_102.PV', display_name: 'Column Reboiler Temp', eng_units: '°C', current_value: 235.8, source_type: 'CENTUM_VP', min_range: 150, max_range: 300 },
  { tag_name: 'PIC_101.PV', display_name: 'Column Top Pressure', eng_units: 'kPa', current_value: 145.2, source_type: 'CENTUM_VP', min_range: 0, max_range: 250 },
  { tag_name: 'VIB_101.RMS', display_name: 'Charge Pump P-101A Vibration', eng_units: 'mm/s', current_value: 1.84, source_type: 'CENTUM_VP', min_range: 0, max_range: 10 },
  { tag_name: 'PUMP_101A.DIFF_HEAD', display_name: 'Charge Pump Diff Head', eng_units: 'm', current_value: 55.4, source_type: 'FUNCTION_BLOCK', min_range: 0, max_range: 100 },
  { tag_name: 'CDU_101.DELTA_T', display_name: 'Fractionation Delta T', eng_units: '°C', current_value: 117.4, source_type: 'FUNCTION_BLOCK', min_range: 0, max_range: 200 },
  { tag_name: 'CDU_101.MT_DISTANCE', display_name: 'MT Anomaly Distance', eng_units: 'score', current_value: 1.42, source_type: 'OPREX_PDA', min_range: 0, max_range: 10 },
  { tag_name: 'AHI_C101.HEALTH', display_name: 'Asset Health Index', eng_units: '%', current_value: 95.4, source_type: 'OPREX_AHI', min_range: 0, max_range: 100 }
];

export default function AddPanelModal({
  tagsList = [],
  currentLayout = [],
  isOpen,
  onClose,
  onAdd,
  onAddAndConfigure
}) {
  // Widget selection & category
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [widgetSearch, setWidgetSearch] = useState('');
  const [selectedWidget, setSelectedWidget] = useState(WIDGET_CATALOG[0]); // Default to Time Series
  
  // Custom configuration in modal
  const [customTitle, setCustomTitle] = useState('Time Series Chart');
  const [selectedTags, setSelectedTags] = useState(['FIC_101.PV']);

  // POINT 3: Custom Widget Configurations & Aesthetics
  const [accentColor, setAccentColor] = useState('#38bdf8');
  const [cardStyle, setCardStyle] = useState('glass'); // 'glass' | 'solid' | 'glow' | 'minimal'
  const [fontSizeScale, setFontSizeScale] = useState('standard'); // 'compact' | 'standard' | 'large'
  const [headerStyle, setHeaderStyle] = useState('full'); // 'full' | 'compact' | 'minimal'
  const [customUnit, setCustomUnit] = useState('');
  const [thresholdWarn, setThresholdWarn] = useState(60);
  const [thresholdCrit, setThresholdCrit] = useState(85);
  const [autoScaleOnShrink, setAutoScaleOnShrink] = useState(true);
  const [showConfigSection, setShowConfigSection] = useState(false);
  
  // Tag browser search & source filtering
  const [tagSearch, setTagSearch] = useState('');
  const [tagSourceFilter, setTagSourceFilter] = useState('ALL');

  // Combine live tag list with fallback tags to guarantee full telemetry accessibility
  const availableTags = useMemo(() => {
    const rawList = Array.isArray(tagsList) && tagsList.length > 0 ? tagsList : FALLBACK_PLANT_TAGS;
    const map = new Map();
    // Insert fallbacks first
    FALLBACK_PLANT_TAGS.forEach(t => map.set(t.tag_name, t));
    // Overlay actual server tags
    rawList.forEach(t => {
      if (t.tag_name) {
        map.set(t.tag_name, {
          ...map.get(t.tag_name),
          ...t,
          current_value: t.latest_value ?? t.current_value ?? (map.get(t.tag_name)?.current_value || 0),
          source_type: t.source_type || t.source || 'CENTUM_VP'
        });
      }
    });
    return Array.from(map.values());
  }, [tagsList]);

  if (!isOpen) return null;

  // Filtered widgets by category and search
  const filteredWidgets = WIDGET_CATALOG.filter(w => {
    const matchCat = selectedCategory === 'ALL' || w.category === selectedCategory;
    const matchSearch = !widgetSearch || 
      w.title.toLowerCase().includes(widgetSearch.toLowerCase()) ||
      w.desc.toLowerCase().includes(widgetSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Filtered tags for the right panel
  const filteredTags = availableTags.filter(t => {
    const matchSource = tagSourceFilter === 'ALL' || t.source_type === tagSourceFilter;
    const matchText = !tagSearch ||
      t.tag_name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      (t.display_name && t.display_name.toLowerCase().includes(tagSearch.toLowerCase())) ||
      (t.eng_units && t.eng_units.toLowerCase().includes(tagSearch.toLowerCase()));
    return matchSource && matchText;
  });

  // Handle widget type selection
  const handleSelectWidget = (widget) => {
    setSelectedWidget(widget);
    
    // Suggest appropriate default tags and title based on widget type
    let suggestedTags = selectedTags;
    let suggestedTitle = widget.title;

    if (widget.id === 'gauge' || widget.id === 'level_circle' || widget.id === 'bullet_graph') {
      suggestedTags = [selectedTags[0] || 'LIC_101.PV'];
      const chosenTag = availableTags.find(t => t.tag_name === suggestedTags[0]);
      if (chosenTag) {
        suggestedTitle = `${widget.title} - ${chosenTag.tag_name}`;
      }
    } else if (widget.id === 'card') {
      suggestedTags = ['AHI_C101.HEALTH'];
      suggestedTitle = 'CDU-101 Asset Health Score';
    } else if (widget.id === 'sankey') {
      suggestedTags = ['FIC_101.PV', 'FIC_102.PV'];
      suggestedTitle = 'Crude Distillation Yield Flow';
    } else if (widget.id === 'alarms') {
      suggestedTags = [];
      suggestedTitle = 'CDU-101 Process Alarm Monitor';
    } else if (widget.id === 'mt_anomaly') {
      suggestedTags = ['TIC_101.PV', 'TIC_102.PV', 'PIC_101.PV', 'FIC_101.PV', 'LIC_101.PV'];
      suggestedTitle = 'Multivariate Radar Anomaly Profile';
    } else if (selectedTags.length === 0) {
      suggestedTags = ['FIC_101.PV'];
    }

    setSelectedTags(suggestedTags);
    setCustomTitle(suggestedTitle);
  };

  // Toggle or select a tag
  const handleToggleTag = (tagObj) => {
    const tagName = tagObj.tag_name;
    const isSingle = selectedWidget ? !selectedWidget.multiTag : false;

    if (isSingle) {
      setSelectedTags([tagName]);
      setCustomTitle(`${selectedWidget?.title || 'Widget'} - ${tagName}`);
    } else {
      setSelectedTags(prev => {
        if (prev.includes(tagName)) {
          return prev.filter(t => t !== tagName);
        } else {
          return [...prev, tagName];
        }
      });
    }
  };

  // Quick Preset Handlers
  const handleApplyPreset = (presetTags, presetTitle) => {
    setSelectedTags(presetTags);
    if (presetTitle) setCustomTitle(presetTitle);
  };

  // Final submission to Dashboard Canvas
  const handleCommitAdd = (openConfigure = false) => {
    if (!selectedWidget) return;

    const firstTagMeta = availableTags.find(t => t.tag_name === selectedTags[0]);
    let defaultMin = firstTagMeta?.min_range ?? 0;
    let defaultMax = firstTagMeta?.max_range ?? 100;
    let defaultUnit = firstTagMeta?.eng_units || '';

    let extraProps = {};
    if (selectedWidget.id === 'bullet_graph') {
      extraProps = { target: defaultMax * 0.75, warning: defaultMax * 0.85, critical: defaultMax * 0.95 };
    } else if (selectedWidget.id === 'echart_script') {
      extraProps = {
        customScript: `const top = Number(context.liveTelemetry['TIC_101.PV']?.value || 118);
const bot = Number(context.liveTelemetry['TIC_102.PV']?.value || 235);
const deltaT = (bot - top).toFixed(1);

return {
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis' },
  grid: { left: '8%', right: '8%', top: '20%', bottom: '20%' },
  xAxis: {
    type: 'category',
    data: ['TIC-101 Overhead', 'TIC-102 Reboiler', 'Delta T'],
    axisLabel: { color: '#94a3b8', fontSize: 10 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    axisLabel: { color: '#64748b', fontSize: 10 }
  },
  series: [{
    type: 'bar',
    barWidth: 32,
    data: [
      { value: top, itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] } },
      { value: bot, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
      { value: Number(deltaT), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } }
    ],
    label: { show: true, position: 'top', color: '#fff', fontWeight: 'bold' }
  }]
};`
      };
    }

    const maxY = (currentLayout || []).reduce((max, p) => Math.max(max, (p.y ?? 0) + (p.h ?? 5)), 0);

    const newPanel = {
      id: 'p_' + Date.now(),
      type: selectedWidget.id,
      title: customTitle.trim() || selectedWidget.title,
      tags: selectedTags,
      min: Number(defaultMin),
      max: Number(defaultMax),
      unit: customUnit.trim() || defaultUnit,
      accentColor,
      cardStyle,
      fontSizeScale,
      headerStyle,
      thresholds: [Number(thresholdWarn), Number(thresholdCrit)],
      autoScaleOnShrink,
      x: 0,
      y: maxY,
      w: selectedWidget.defaultW || 6,
      h: selectedWidget.defaultH || 5,
      ...extraProps
    };

    onAdd(newPanel);
    if (openConfigure && onAddAndConfigure) {
      onAddAndConfigure(newPanel);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* ================================================================== */}
        {/* TOP HEADER                                                         */}
        {/* ================================================================== */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Add Dashboard Widget
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
                  OPREX AHI 1.3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Step 1: Choose widget type &nbsp;•&nbsp; Step 2: Select process tags &nbsp;•&nbsp; Step 3: Add to canvas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================== */}
        {/* MAIN BODY: 2-COLUMN SPLIT (Catalog on Left, Tag Browser on Right)  */}
        {/* ================================================================== */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* ---------------------------------------------------------------- */}
          {/* LEFT COLUMN: WIDGET SELECTION CATALOG (56% width)                */}
          {/* ---------------------------------------------------------------- */}
          <div className="w-full md:w-[56%] flex flex-col border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 min-h-0">
            {/* Search & Category Pills */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter 24 industrial widgets by name or description..."
                  value={widgetSearch}
                  onChange={(e) => setWidgetSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {widgetSearch && (
                  <button
                    onClick={() => setWidgetSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {WIDGET_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition text-xs border ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
              {filteredWidgets.map((w) => {
                const isSelected = selectedWidget?.id === w.id;
                return (
                  <div
                    key={w.id}
                    onClick={() => handleSelectWidget(w)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {w.icon}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono border border-slate-800">
                            {w.multiTag ? 'Multi-Tag' : 'Single-Tag'}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                        {w.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {w.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{w.categoryLabel}</span>
                      <span className="font-mono text-cyan-400/80 group-hover:text-cyan-300">
                        {w.defaultW} × {w.defaultH} cells
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* RIGHT COLUMN: PROCESS TAG BROWSER & CONFIGURATION (44% width)   */}
          {/* ---------------------------------------------------------------- */}
          <div className="w-full md:w-[44%] flex flex-col bg-slate-950 min-h-0">
            {selectedWidget ? (
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* Section Header */}
                <div className="p-4 bg-slate-900/40 border-b border-slate-800 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      Configure {selectedWidget.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedTags.length} tag(s) selected
                    </span>
                  </div>

                  {/* Widget Display Title Input */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Widget Display Title:
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Overhead Vapor Temperature"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Selected Tags Chips */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Assigned Process Tags:</span>
                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-0.5">
                      {selectedTags.length === 0 ? (
                        <span className="text-xs text-amber-400 italic">
                          No tags selected! Choose at least 1 process tag from the list below.
                        </span>
                      ) : (
                        selectedTags.map(tag => {
                          const tagObj = availableTags.find(t => t.tag_name === tag);
                          return (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono text-[11px] font-bold"
                            >
                              {tag}
                              {tagObj && tagObj.eng_units && (
                                <span className="text-slate-400 font-normal">({tagObj.eng_units})</span>
                              )}
                              <button
                                onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                                className="hover:text-rose-400 ml-0.5"
                                title="Remove tag"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Quick Loop Presets */}
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Quick Process Presets:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(['FIC_101.PV'], 'Crude Feed Flow Rate (FIC-101)')}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-cyan-300 border border-slate-700/80 font-mono"
                      >
                        FIC-101 Feed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(['TIC_101.PV', 'TIC_102.PV'], 'Column Fractionation Temperatures')}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-amber-300 border border-slate-700/80 font-mono"
                      >
                        TIC-101/102 Temps
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(['LIC_101.PV', 'PIC_101.PV'], 'Column Sump & Pressure')}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-300 border border-slate-700/80 font-mono"
                      >
                        LIC-101 & PIC-101
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(['PUMP_101A.DIFF_HEAD', 'VIB_101.RMS'], 'Charge Pump P-101A Health')}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-300 border border-slate-700/80 font-mono"
                      >
                        Pump P-101A
                      </button>
                    </div>
                  </div>

                  {/* POINT 3: Custom Widget Configurations & Appearance Controls */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowConfigSection(!showConfigSection)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-cyan-400 hover:text-cyan-300 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        Custom Widget Configurations & Styling ({cardStyle}, {fontSizeScale})
                      </span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                        {showConfigSection ? 'Hide ▲' : 'Customize ▼'}
                      </span>
                    </button>

                    {showConfigSection && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                        {/* Color Theme Selector */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Theme Accent Color:</label>
                          <div className="flex items-center gap-1.5">
                            {[
                              { hex: '#38bdf8', label: 'Cyber Blue' },
                              { hex: '#10b981', label: 'Emerald' },
                              { hex: '#f59e0b', label: 'Industrial Amber' },
                              { hex: '#ef4444', label: 'Crimson' },
                              { hex: '#a855f7', label: 'Violet' },
                              { hex: '#94a3b8', label: 'Monochrome' }
                            ].map(col => (
                              <button
                                key={col.hex}
                                type="button"
                                onClick={() => setAccentColor(col.hex)}
                                style={{ backgroundColor: col.hex }}
                                title={col.label}
                                className={`w-5 h-5 rounded-full transition-transform ${
                                  accentColor === col.hex ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Card Style & Typography Scale */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Card Style:</label>
                            <select
                              value={cardStyle}
                              onChange={(e) => setCardStyle(e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white"
                            >
                              <option value="glass">Glassmorphic Glow</option>
                              <option value="solid">Solid Industrial</option>
                              <option value="glow">High-Contrast Border</option>
                              <option value="minimal">Clean Minimal</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Typography Scale:</label>
                            <select
                              value={fontSizeScale}
                              onChange={(e) => setFontSizeScale(e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white"
                            >
                              <option value="compact">Compact (11px)</option>
                              <option value="standard">Standard (13px)</option>
                              <option value="large">High-Visibility (16px)</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom Units & Thresholds */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Unit Label:</label>
                            <input
                              type="text"
                              value={customUnit}
                              onChange={(e) => setCustomUnit(e.target.value)}
                              placeholder="°C / bar / %"
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-amber-400 block mb-1 font-semibold">Warning Limit:</label>
                            <input
                              type="number"
                              value={thresholdWarn}
                              onChange={(e) => setThresholdWarn(Number(e.target.value))}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-rose-400 block mb-1 font-semibold">Critical Trip:</label>
                            <input
                              type="number"
                              value={thresholdCrit}
                              onChange={(e) => setThresholdCrit(Number(e.target.value))}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Responsive Shrink Adaptability Mode */}
                        <div className="flex items-center justify-between pt-1">
                          <label className="text-[11px] text-slate-300 font-semibold cursor-pointer flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={autoScaleOnShrink}
                              onChange={(e) => setAutoScaleOnShrink(e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <span>Auto-Scale layout when widget is shrunk (prevents clipping)</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tag Search & Source Filter Tabs */}
                <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-2 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search telemetry tags by name, units, or description..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    {tagSearch && (
                      <button
                        onClick={() => setTagSearch('')}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-white text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1 overflow-x-auto text-[10px] font-semibold no-scrollbar">
                    {['ALL', 'CENTUM_VP', 'BROKER_DEVICE', 'FUNCTION_BLOCK', 'OPREX_AHI'].map(src => (
                      <button
                        key={src}
                        onClick={() => setTagSourceFilter(src)}
                        className={`px-2 py-0.5 rounded-full whitespace-nowrap transition border ${
                          tagSourceFilter === src
                            ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {src === 'ALL' ? 'All Sources' : src.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                  {filteredTags.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 italic">
                      No process tags match "{tagSearch}".
                    </div>
                  ) : (
                    filteredTags.map((t) => {
                      const isChecked = selectedTags.includes(t.tag_name);
                      return (
                        <div
                          key={t.tag_name}
                          onClick={() => handleToggleTag(t)}
                          className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer text-xs ${
                            isChecked
                              ? 'bg-cyan-950/60 border-cyan-500/80 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox / Radio indicator */}
                            <div className={`w-4 h-4 rounded ${selectedWidget.multiTag ? 'rounded' : 'rounded-full'} border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                                : 'border-slate-600 bg-slate-950'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-cyan-300 truncate">
                                  {t.tag_name}
                                </span>
                                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono shrink-0">
                                  {t.source_type}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {t.display_name || t.tag_name}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            <span className="font-mono font-bold text-emerald-400 block">
                              {Number(t.current_value).toFixed(1)} {t.eng_units}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              [{t.min_range || 0} - {t.max_range || 100}]
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Sliders className="w-10 h-10 text-slate-700 mb-2" />
                <h4 className="text-sm font-bold text-slate-300">No Widget Selected</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Click any widget card on the left gallery to select it and configure telemetry tags.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ================================================================== */}
        {/* BOTTOM ACTION FOOTER                                               */}
        {/* ================================================================== */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Ready to add:</span>
            <span className="font-bold text-white">
              {selectedWidget ? selectedWidget.title : 'None selected'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-mono font-semibold">
              {selectedTags.length} tag(s) bound
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              disabled={!selectedWidget || selectedTags.length === 0}
              onClick={() => handleCommitAdd(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add widget and open comprehensive 6-tab editor"
            >
              Add & Configure More...
            </button>
            <button
              disabled={!selectedWidget || selectedTags.length === 0}
              onClick={() => handleCommitAdd(false)}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add to Dashboard Canvas
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
