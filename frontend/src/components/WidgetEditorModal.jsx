import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  X, Check, Activity, Gauge, Map, ShieldAlert, 
  Table, Code, Sliders, Layers, Sparkles, BookOpen,
  Eye, GitMerge, BarChart3, Compass, Terminal, Image,
  Calendar, Grid3X3, Folder, ListTree, PieChart,
  Play, RefreshCw, AlertCircle, Palette
} from 'lucide-react';
import { WIDGET_CATALOG } from './AddPanelModal';

export default function WidgetEditorModal({
  widget,
  tagsList = [],
  dashboards = [],
  isOpen,
  onClose,
  onSave
}) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'tags' | 'styling' | 'limits' | 'specific' | 'script'
  
  // General & Type
  const [title, setTitle] = useState('');
  const [type, setType] = useState('timeseries');
  const [subtitle, setSubtitle] = useState('');
  
  // Tags & Data
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagAliases, setTagAliases] = useState({});
  const [tagSearch, setTagSearch] = useState('');
  const [tagSourceFilter, setTagSourceFilter] = useState('ALL');
  
  // Styling
  const [radius, setRadius] = useState(12);
  const [cardStyle, setCardStyle] = useState('glass'); // 'glass' | 'solid' | 'glow' | 'semi' | 'transparent'
  const [accentColor, setAccentColor] = useState('#38bdf8');
  
  // Limits & ISA-18.2 Step Ranges
  const [minVal, setMinVal] = useState(0);
  const [maxVal, setMaxVal] = useState(100);
  const [targetVal, setTargetVal] = useState(80);
  const [unit, setUnit] = useState('');
  const [thresholds, setThresholds] = useState([60, 85]); // [warn, crit]
  
  // Specific settings
  const [targetDashboard, setTargetDashboard] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [targetDevice, setTargetDevice] = useState('CENTUM_VP_FCS01');
  const [defaultSV, setDefaultSV] = useState(120.0);
  const [chartStyle, setChartStyle] = useState('donut'); // 'donut' | 'pie' | 'ring' | 'half_donut' | 'rose'
  const [innerRadius, setInnerRadius] = useState(48);
  const [outerRadius, setOuterRadius] = useState(74);
  const [padAngle, setPadAngle] = useState(2);
  const [borderRadius, setBorderRadius] = useState(5);
  const [centerFormat, setCenterFormat] = useState('value_pct');
  const [legendPosition, setLegendPosition] = useState('bottom');
  const [gaugeAngle, setGaugeAngle] = useState('speedometer');
  const [gaugeStyle, setGaugeStyle] = useState('pointer');
  const [curveStyle, setCurveStyle] = useState('smooth');
  const [showArea, setShowArea] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [vesselShape, setVesselShape] = useState('circle');
  const [animateWave, setAnimateWave] = useState(true);
  
  // Custom ECharts Script & Live Preview
  const [customScript, setCustomScript] = useState('');
  const [scriptError, setScriptError] = useState(null);
  const chartPreviewRef = useRef(null);
  const chartPreviewInstance = useRef(null);

  // Starter templates
  const scriptTemplates = [
    {
      name: 'Thermal Delta T Dual-Gauge',
      desc: 'Top to Bottom Column Temperature Delta (TIC_102 - TIC_101)',
      script: `// context = { tags, liveTelemetry, historicalData, echarts }
const top = Number(context.liveTelemetry['TIC_101.PV']?.value || 118);
const bot = Number(context.liveTelemetry['TIC_102.PV']?.value || 235);
const deltaT = (bot - top).toFixed(1);

return {
  backgroundColor: 'transparent',
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 50,
    max: 180,
    splitNumber: 5,
    axisLine: {
      lineStyle: {
        width: 12,
        color: [[0.5, '#10b981'], [0.8, '#f59e0b'], [1, '#f43f5e']]
      }
    },
    pointer: { itemStyle: { color: '#38bdf8' }, length: '70%', width: 4 },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
    detail: {
      formatter: '{value} °C ΔT',
      color: '#38bdf8',
      fontSize: 16,
      fontWeight: 'bold',
      offsetCenter: [0, '25%']
    },
    data: [{ value: Number(deltaT), name: 'Column ΔT' }]
  }]
};`
    },
    {
      name: 'Multi-Tag Radar Comparison',
      desc: 'Normalized multi-axis radar profile of active telemetry loops',
      script: `// context = { tags, liveTelemetry, historicalData, echarts }
const tags = context.tags.length > 0 ? context.tags : ['TIC_101.PV', 'TIC_102.PV', 'PIC_101.PV', 'FIC_101.PV', 'LIC_101.PV'];
const indicators = tags.map(t => ({ name: t, max: 500 }));
const values = tags.map(t => Number(context.liveTelemetry[t]?.value || 100));

return {
  backgroundColor: 'transparent',
  tooltip: {},
  radar: {
    indicator: indicators,
    radius: '65%',
    axisName: { color: '#94a3b8', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    splitArea: { areaStyle: { color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.03)'] } }
  },
  series: [{
    type: 'radar',
    data: [{
      value: values,
      name: 'Telemetry Profile',
      areaStyle: { color: 'rgba(56, 189, 248, 0.3)' },
      lineStyle: { color: '#38bdf8', width: 2 }
    }]
  }]
};`
    },
    {
      name: 'Pressure vs Reflux Scatter Curve',
      desc: 'Correlates column overhead pressure with reflux feed rate',
      script: `// context = { tags, liveTelemetry, historicalData, echarts }
const scatterData = [
  [142, 178], [144, 180], [145, 182], [146, 184], 
  [147, 185], [145, 181], [143, 179], [148, 188]
];

return {
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item' },
  xAxis: {
    name: 'Pressure (kPa)',
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    axisLabel: { color: '#64748b' }
  },
  yAxis: {
    name: 'Reflux (m³/h)',
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    axisLabel: { color: '#64748b' }
  },
  series: [{
    type: 'scatter',
    data: scatterData,
    symbolSize: 10,
    itemStyle: { color: '#a855f7' }
  }]
};`
    },
    {
      name: 'Dynamic Real-time Waterfall Flow',
      desc: 'Energy balance and product component yield distribution',
      script: `// context = { tags, liveTelemetry, historicalData, echarts }
return {
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '8%', top: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['Crude Feed', 'Naphtha', 'Kerosene', 'Diesel', 'Residue'],
    axisLabel: { color: '#94a3b8', fontSize: 10 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    axisLabel: { color: '#64748b' }
  },
  series: [
    {
      name: 'Baseline',
      type: 'bar',
      stack: 'Total',
      itemStyle: { borderColor: 'transparent', color: 'transparent' },
      emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
      data: [0, 800, 600, 350, 0]
    },
    {
      name: 'Yield Stream',
      type: 'bar',
      stack: 'Total',
      label: { show: true, position: 'top', color: '#f1f5f9' },
      data: [1000, 200, 200, 250, 350],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#38bdf8' },
          { offset: 1, color: '#0369a1' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }
  ]
};`
    }
  ];

  // Initialize values when widget is opened
  useEffect(() => {
    if (widget) {
      setTitle(widget.title || '');
      setType(widget.type || 'timeseries');
      setSubtitle(widget.subtitle || '');
      setSelectedTags(widget.tags ? [...widget.tags] : []);
      setTagAliases(widget.tagAliases ? { ...widget.tagAliases } : {});
      
      setRadius(widget.radius ?? 12);
      setCardStyle(widget.cardStyle || 'glass');
      setAccentColor(widget.accentColor || '#38bdf8');
      
      setMinVal(widget.min ?? 0);
      setMaxVal(widget.max ?? 100);
      setTargetVal(widget.target ?? 80);
      setUnit(widget.unit || '');
      setThresholds(widget.thresholds || [60, 85]);
      
      setTargetDashboard(widget.targetDashboard || '');
      setTargetUrl(widget.targetUrl || '');
      setButtonText(widget.buttonText || '');
      setTargetDevice(widget.targetDevice || 'CENTUM_VP_FCS01');
      setDefaultSV(widget.defaultSV ?? 120.0);
      setChartStyle(widget.chartStyle || 'donut');
      setInnerRadius(widget.innerRadius ?? 48);
      setOuterRadius(widget.outerRadius ?? 74);
      setPadAngle(widget.padAngle ?? 2);
      setBorderRadius(widget.borderRadius ?? 5);
      setCenterFormat(widget.centerFormat || 'value_pct');
      setLegendPosition(widget.legendPosition || 'bottom');
      setGaugeAngle(widget.gaugeAngle || 'speedometer');
      setGaugeStyle(widget.gaugeStyle || 'pointer');
      setCurveStyle(widget.curveStyle || 'smooth');
      setShowArea(widget.showArea !== false);
      setShowPoints(Boolean(widget.showPoints));
      setVesselShape(widget.vesselShape || 'circle');
      setAnimateWave(widget.animateWave !== false);
      
      setCustomScript(widget.customScript || scriptTemplates[0].script);
      setActiveTab('general');
    }
  }, [widget]);

  // Live Chart Preview Render
  useEffect(() => {
    if (activeTab !== 'script' || !chartPreviewRef.current) return;
    
    if (!chartPreviewInstance.current) {
      chartPreviewInstance.current = echarts.init(chartPreviewRef.current);
    }

    try {
      setScriptError(null);
      const sampleContext = {
        tags: selectedTags.length > 0 ? selectedTags : ['TIC_101.PV', 'TIC_102.PV'],
        liveTelemetry: {
          'TIC_101.PV': { value: 118.4, eng_units: '°C' },
          'TIC_102.PV': { value: 235.1, eng_units: '°C' },
          'PIC_101.PV': { value: 145.2, eng_units: 'kPa' },
          'FIC_101.PV': { value: 450.0, eng_units: 'm³/h' },
          'LIC_101.PV': { value: 58.5, eng_units: '%' }
        },
        historicalData: [
          { tag: 'TIC_101.PV', datapoints: [{ time: '10:00', value: 115 }, { time: '10:05', value: 118 }] }
        ],
        echarts: echarts
      };

      const fn = new Function('context', customScript);
      const option = fn(sampleContext);
      if (option && typeof option === 'object') {
        chartPreviewInstance.current.setOption(option, true);
        chartPreviewInstance.current.resize();
      }
    } catch (err) {
      setScriptError(err.message);
    }
  }, [activeTab, customScript, selectedTags]);

  if (!isOpen || !widget) return null;

  const handleTagToggle = (tagName) => {
    const singleTagTypes = ['gauge', 'singlestat', 'card', 'bullet_graph', 'level_circle', 'dynamic_loader'];
    const meta = tagsList.find(t => t.tag_name === tagName);

    if (singleTagTypes.includes(type)) {
      setSelectedTags([tagName]);
      if (meta) {
        setUnit(meta.eng_units || '');
        setMinVal(meta.min_range || 0);
        setMaxVal(meta.max_range || 100);
      }
    } else {
      setSelectedTags(prev => {
        const next = prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName];
        // If type is piechart and now only 1 tag selected, auto-sync unit & scale
        if (type === 'piechart' && next.length === 1 && meta) {
          setUnit(meta.eng_units || '');
          if (meta.max_range) setMaxVal(meta.max_range);
        }
        return next;
      });
    }
  };

  const handleRemoveTag = (tagName) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName));
    const nextAliases = { ...tagAliases };
    delete nextAliases[tagName];
    setTagAliases(nextAliases);
  };

  const handleSave = () => {
    const updatedWidget = {
      ...widget,
      title: title.trim() || 'Custom Widget',
      type: type,
      subtitle: subtitle,
      tags: selectedTags,
      tagAliases: tagAliases,
      radius: Number(radius),
      cardStyle: cardStyle,
      accentColor: accentColor,
      min: Number(minVal),
      max: Number(maxVal),
      target: Number(targetVal),
      unit: unit,
      chartStyle: chartStyle,
      innerRadius: Number(innerRadius),
      outerRadius: Number(outerRadius),
      padAngle: Number(padAngle),
      borderRadius: Number(borderRadius),
      centerFormat: centerFormat,
      legendPosition: legendPosition,
      gaugeAngle: gaugeAngle,
      gaugeStyle: gaugeStyle,
      curveStyle: curveStyle,
      showArea: Boolean(showArea),
      showPoints: Boolean(showPoints),
      vesselShape: vesselShape,
      animateWave: Boolean(animateWave),
      thresholds: thresholds,
      targetDashboard: targetDashboard,
      targetUrl: targetUrl,
      buttonText: buttonText,
      targetDevice: targetDevice,
      defaultSV: Number(defaultSV),
      customScript: customScript
    };
    onSave(updatedWidget);
    onClose();
  };

  // Group catalog into categories for quick selection
  const catalogCategories = [
    {
      title: 'Trends & Time-Series',
      ids: ['timeseries', 'timeseries_v2', 'barchart', 'histogram', 'xy_plot', 'state_timeline']
    },
    {
      title: 'KPIs, Gauges & Values',
      ids: ['gauge', 'singlestat', 'bullet_graph', 'level_circle', 'dynamic_loader', 'card']
    },
    {
      title: 'Process Mimic & Spatial',
      ids: ['synoptic', '3d_model', 'map', 'floor_heatmap', 'heatmap_table']
    },
    {
      title: 'Analytics & Diagnostics',
      ids: ['mt_anomaly', 'sankey', 'piechart', 'correlation_matrix']
    },
    {
      title: 'Tables & Asset Monitoring',
      ids: ['datatable', 'summary_table', 'asset_list', 'alarms']
    },
    {
      title: 'Control, Navigation & Custom',
      ids: ['navigator', 'command', 'asset_media', 'image_list', 'folding', 'echart_script']
    }
  ];

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{
        width: '840px',
        maxWidth: '96vw',
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#131822',
        border: '1px solid #1e3a8a',
        padding: '0',
        borderRadius: '8px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#38bdf8" />
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f1f5f9' }}>
                Widget Customization & Inspector
              </span>
              <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                ID: {widget.id}
              </span>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.25)',
          padding: '0 16px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'general', label: '1. General & Type' },
            { id: 'tags', label: `2. Tags & Data (${selectedTags.length})` },
            { id: 'styling', label: '3. Visual Styling' },
            { id: 'limits', label: '4. Limits & Thresholds' },
            { id: 'specific', label: '5. Widget Options' },
            { id: 'script', label: '6. Custom ECharts Script' }
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          
          {/* TAB 1: GENERAL & TYPE SELECTOR */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Widget Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter widget title..."
                  />
                </div>
                <div>
                  <label className="form-label">Subtitle / Sub-label</label>
                  <input
                    type="text"
                    className="form-input"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. CDU-101 Loop"
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>
                  Select Widget Visualization Type (All 31 Catalog Widgets)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {catalogCategories.map(cat => (
                    <div key={cat.title}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {cat.title}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {cat.ids.map(id => {
                          const item = WIDGET_CATALOG.find(w => w.id === id) || { id, title: id };
                          const isSelected = type === id;
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                setType(id);
                                if (!title || title === widget.title) setTitle(item.title);
                              }}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
                                color: isSelected ? '#38bdf8' : '#e2e8f0',
                                fontSize: '0.78rem',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {item.icon || <Activity size={16} />}
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TAGS & DATA SOURCE */}
          {activeTab === 'tags' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Bound Process Telemetry Tags</label>
                {selectedTags.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}>
                    No tags currently assigned. Select from the available tag catalogue below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {selectedTags.map(tag => (
                      <div
                        key={tag}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8', fontWeight: 600 }}>
                            {tag}
                          </span>
                          <input
                            type="text"
                            placeholder="Alias legend label..."
                            value={tagAliases[tag] || ''}
                            onChange={(e) => setTagAliases({ ...tagAliases, [tag]: e.target.value })}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              color: '#fff',
                              fontSize: '0.72rem'
                            }}
                          />
                        </div>
                        <X 
                          size={14} 
                          color="#f43f5e" 
                          style={{ cursor: 'pointer' }} 
                          onClick={() => handleRemoveTag(tag)} 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Search Available Field Tags & Attributes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter tag by name, loop, unit or engineering units..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />

                {/* Source Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px' }}>
                  {['ALL', 'CENTUM_VP', 'BROKER_DEVICE', 'FUNCTION_BLOCK', 'OPREX_AHI'].map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setTagSourceFilter(src)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: tagSourceFilter === src ? '#0284c7' : '#1e293b',
                        color: tagSourceFilter === src ? '#fff' : '#94a3b8',
                        border: tagSourceFilter === src ? '1px solid #38bdf8' : '1px solid #334155'
                      }}
                    >
                      {src === 'ALL' ? 'All Sources' : src.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '4px'
                }}>
                  {tagsList
                    .filter(t => {
                      const matchSource = tagSourceFilter === 'ALL' || t.source_type === tagSourceFilter || t.source === tagSourceFilter;
                      const matchText = !tagSearch || 
                        t.tag_name.toLowerCase().includes(tagSearch.toLowerCase()) ||
                        (t.display_name && t.display_name.toLowerCase().includes(tagSearch.toLowerCase())) ||
                        (t.eng_units && t.eng_units.toLowerCase().includes(tagSearch.toLowerCase()));
                      return matchSource && matchText;
                    })
                    .map(t => {
                      const isSelected = selectedTags.includes(t.tag_name);
                      return (
                        <div
                          key={t.tag_name}
                          onClick={() => handleTagToggle(t.tag_name)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            color: isSelected ? '#38bdf8' : '#cbd5e1',
                            fontSize: '0.78rem'
                          }}
                        >
                          <div>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                              {t.tag_name}
                            </span>
                            <span style={{ color: '#64748b', marginLeft: '8px' }}>
                              {t.display_name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {t.current_value !== undefined && t.current_value !== null && (
                              <span style={{ color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '0.75rem' }}>
                                {Number(t.current_value).toFixed(1)}
                              </span>
                            )}
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                              {t.eng_units}
                            </span>
                            {isSelected && <Check size={14} color="#38bdf8" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VISUAL STYLING */}
          {activeTab === 'styling' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Container Corner Radius: {radius}px</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="2"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[0, 6, 12, 18, 24].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRadius(r)}
                        className="btn"
                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      >
                        {r}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Container Visual Style / Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'glass', name: 'Glassmorphism', desc: 'Frosted gradient with blur' },
                    { id: 'solid', name: 'Dark Slate Solid', desc: 'Opaque industrial `#0f172a`' },
                    { id: 'glow', name: 'Neon Glow Border', desc: 'Subtle reactive accent glow' },
                    { id: 'semi', name: 'Semi-Transparent', desc: '40% backdrop fill' },
                    { id: 'transparent', name: 'Transparent Frame', desc: 'Dashed minimalist canvas' }
                  ].map(style => (
                    <div
                      key={style.id}
                      onClick={() => setCardStyle(style.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: cardStyle === style.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                        background: cardStyle === style.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: cardStyle === style.id ? '#38bdf8' : '#e2e8f0' }}>
                        {style.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                        {style.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Primary Accent Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {[
                    { color: '#38bdf8', label: 'Yokogawa Cyan' },
                    { color: '#10b981', label: 'Emerald Normal' },
                    { color: '#f59e0b', label: 'Amber Advisory' },
                    { color: '#a855f7', label: 'Deep Purple' },
                    { color: '#f43f5e', label: 'Rose Critical' },
                    { color: '#6366f1', label: 'Indigo' }
                  ].map(c => (
                    <div
                      key={c.color}
                      onClick={() => setAccentColor(c.color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: c.color,
                        cursor: 'pointer',
                        border: accentColor === c.color ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: accentColor === c.color ? '0 0 10px ' + c.color : 'none'
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIMITS & ISA-18.2 STEP RANGES */}
          {activeTab === 'limits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Minimum Scale</label>
                  <input
                    type="number"
                    className="form-input"
                    value={minVal}
                    onChange={(e) => setMinVal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Maximum Scale</label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxVal}
                    onChange={(e) => setMaxVal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Setpoint</label>
                  <input
                    type="number"
                    className="form-input"
                    value={targetVal}
                    onChange={(e) => setTargetVal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Override</label>
                  <input
                    type="text"
                    className="form-input"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="°C, kPa, %"
                  />
                </div>
              </div>

              <div style={{
                background: '#090d14',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                  ISA-18.2 Alarm Step Ranges & Band Limits
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#fbbf24' }}>Warning Limit (Amber Band)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={thresholds[0]}
                      onChange={(e) => setThresholds([Number(e.target.value), thresholds[1]])}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#f87171' }}>Critical Limit (Red Band)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={thresholds[1]}
                      onChange={(e) => setThresholds([thresholds[0], Number(e.target.value)])}
                    />
                  </div>
                </div>

                {/* Range Bar Graphic */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', height: '14px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ flex: thresholds[0], background: 'rgba(16, 185, 129, 0.7)' }} title="Safe Range (Normal)" />
                    <div style={{ flex: Math.max(1, thresholds[1] - thresholds[0]), background: 'rgba(245, 158, 11, 0.7)' }} title="Advisory Warning" />
                    <div style={{ flex: Math.max(1, maxVal - thresholds[1]), background: 'rgba(244, 63, 94, 0.7)' }} title="Critical Out of Bounds" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                    <span>Min: {minVal}</span>
                    <span style={{ color: '#10b981' }}>Normal &lt; {thresholds[0]}</span>
                    <span style={{ color: '#f59e0b' }}>Warn {thresholds[0]} - {thresholds[1]}</span>
                    <span style={{ color: '#f43f5e' }}>Crit &gt; {thresholds[1]}</span>
                    <span>Max: {maxVal}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WIDGET SPECIFIC OPTIONS */}
          {activeTab === 'specific' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Navigator settings */}
              {(type === 'navigator' || !type) && (
                <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Navigator Widget Settings
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <label className="form-label">Target Dashboard Shortcut</label>
                      <select
                        className="form-input"
                        value={targetDashboard}
                        onChange={(e) => setTargetDashboard(e.target.value)}
                      >
                        <option value="">-- Multi-shortcut mode --</option>
                        <option value="refinery-cdu-overview">Atmospheric Distillation (CDU)</option>
                        <option value="oprex-ahi-asset-health">OpreX AHI & Anomaly Diagnostics</option>
                        <option value="multi-unit-plant-wide">Refinery Fleet Plant-Wide</option>
                        {dashboards.map(d => (
                          <option key={d.slug} value={d.slug}>{d.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Button Action Label</label>
                      <input
                        type="text"
                        className="form-input"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="e.g. Open Asset Diagnostics"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">External Web URL (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://docs.ahi.apps.yokogawa.com/..."
                    />
                  </div>
                </div>
              )}

              {/* Command Widget settings */}
              {(type === 'command' || !type) && (
                <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Command & Actuation Controller Settings
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Target Control Station / IoT Node</label>
                      <input
                        type="text"
                        className="form-input"
                        value={targetDevice}
                        onChange={(e) => setTargetDevice(e.target.value)}
                        placeholder="e.g. CENTUM_VP_FCS01"
                      />
                    </div>
                    <div>
                      <label className="form-label">Default Setpoint Value (SV)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={defaultSV}
                        onChange={(e) => setDefaultSV(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pie / Donut Chart settings */}
              {type === 'piechart' && (
                <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Pie, Donut & Polar Gauge Configuration
                  </div>
                  
                  {/* 5 Distinct Styles */}
                  <label className="form-label">Visual Ratio Geometry Style</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { id: 'donut', name: 'Donut', desc: 'Center readout' },
                      { id: 'pie', name: 'Solid Pie', desc: 'Solid sectors' },
                      { id: 'ring', name: 'Thin Ring', desc: 'Gauge ring' },
                      { id: 'half_donut', name: 'Half Donut', desc: '180° Speedometer' },
                      { id: 'rose', name: 'Rose', desc: 'Polar area' }
                    ].map(st => (
                      <div
                        key={st.id}
                        onClick={() => setChartStyle(st.id)}
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          border: chartStyle === st.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                          background: chartStyle === st.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: chartStyle === st.id ? '#38bdf8' : '#e2e8f0' }}>
                          {st.name}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px' }}>
                          {st.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Radii Sliders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Inner Radius Cutout: {innerRadius}%</label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="2"
                        value={innerRadius}
                        onChange={(e) => setInnerRadius(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="form-label">Outer Radius Scale: {outerRadius}%</label>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="1"
                        value={outerRadius}
                        onChange={(e) => setOuterRadius(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Corner & Gap Sliders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Sector Corner Radius: {borderRadius}px</label>
                      <input
                        type="range"
                        min="0"
                        max="12"
                        step="1"
                        value={borderRadius}
                        onChange={(e) => setBorderRadius(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="form-label">Sector Separation Gap: {padAngle}°</label>
                      <input
                        type="range"
                        min="0"
                        max="6"
                        step="1"
                        value={padAngle}
                        onChange={(e) => setPadAngle(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Center Metric & Legend Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Center Digital Metric Format</label>
                      <select
                        className="form-input"
                        value={centerFormat}
                        onChange={(e) => setCenterFormat(e.target.value)}
                      >
                        <option value="value_pct">Value + Unit &amp; Percentage</option>
                        <option value="pct_only">Percentage Only (%)</option>
                        <option value="value_only">Value &amp; Unit Only</option>
                        <option value="none">Hidden (No Center Text)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Legend Placement</label>
                      <select
                        className="form-input"
                        value={legendPosition}
                        onChange={(e) => setLegendPosition(e.target.value)}
                      >
                        <option value="bottom">Bottom Horizontal</option>
                        <option value="right">Right Vertical</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    lineHeight: '1.4'
                  }}>
                    {selectedTags.length === 1 ? (
                      <div>
                        <strong style={{ color: '#38bdf8' }}>Single-Tag Mode:</strong> Mapped to <span style={{ fontFamily: 'monospace', color: '#fff' }}>{selectedTags[0]}</span>. Donut computes live value vs upper headroom (<span style={{ color: '#fff' }}>{maxVal} {unit}</span>) with centered live telemetry.
                      </div>
                    ) : selectedTags.length > 1 ? (
                      <div>
                        <strong style={{ color: '#10b981' }}>Multi-Tag Mode:</strong> Mapped to <strong style={{ color: '#fff' }}>{selectedTags.length} tags</strong>. Each tag forms a proportional slice representing its live telemetry ratio.
                      </div>
                    ) : (
                      <div>
                        <strong style={{ color: '#f59e0b' }}>Zero Tags:</strong> Fallback to standard CDU Fractionation product cuts yield distribution.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gauge Specific Options */}
              {type === 'gauge' && (
                <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Industrial Dial Gauge Configuration
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Dial Arc Angle</label>
                      <select
                        className="form-input"
                        value={gaugeAngle}
                        onChange={(e) => setGaugeAngle(e.target.value)}
                      >
                        <option value="speedometer">240° Speedometer Standard</option>
                        <option value="semicircle">180° Semi-Circle Flat Gauge</option>
                        <option value="round">300° Full Circular Dial</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Indicator Style</label>
                      <select
                        className="form-input"
                        value={gaugeStyle}
                        onChange={(e) => setGaugeStyle(e.target.value)}
                      >
                        <option value="pointer">Precision Needle Pointer</option>
                        <option value="progress">Modern Arc Progress Bar</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TimeSeries & Bar Chart Options */}
              {(type === 'timeseries' || type === 'timeseries_v2' || type === 'barchart') && (
                <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Trend Curve &amp; Graph Presentation
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Curve Interpolation</label>
                      <select
                        className="form-input"
                        value={curveStyle}
                        onChange={(e) => setCurveStyle(e.target.value)}
                      >
                        <option value="smooth">Smooth Bezier Curve</option>
                        <option value="linear">Crisp Straight Linear</option>
                        <option value="step">Stepped Digital Ladder</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={showArea}
                          onChange={(e) => setShowArea(e.target.checked)}
                        />
                        <span>Area Gradient Fill</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={showPoints}
                          onChange={(e) => setShowPoints(e.target.checked)}
                        />
                        <span>Show Data Point Symbols</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Level Circle Options */}
              {type === 'level_circle' && (
                <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Level Meter Vessel Configuration
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label">Vessel Geometry</label>
                      <select
                        className="form-input"
                        value={vesselShape}
                        onChange={(e) => setVesselShape(e.target.value)}
                      >
                        <option value="circle">Circular Drum Vessel</option>
                        <option value="cylinder">Vertical Distillation Cylinder</option>
                        <option value="rect">Rectangular Storage Tank</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={animateWave}
                          onChange={(e) => setAnimateWave(e.target.checked)}
                        />
                        <span>Animated Liquid Surface Wave</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Card / 3D Model General Context */}
              <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                  Industrial Plant Integration
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  This widget is configured to stream real-time events via the <strong>Redis Event In-Memory Bus (`ydash:stream`)</strong> and executes deterministic calculations through the Yokogawa AHI engine.
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOM SCRIPT & LIVE PREVIEW */}
          {activeTab === 'script' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Write JavaScript that returns an <strong>ECharts Option Object</strong>:
                </div>
                {/* Template buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {scriptTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn"
                      onClick={() => {
                        setCustomScript(tpl.script);
                        setType('echart_script');
                      }}
                      title={tpl.desc}
                      style={{ padding: '3px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Sparkles size={11} color="#a855f7" />
                      <span>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Box & Code Editor Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <textarea
                    className="form-input"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.74rem',
                      height: '320px',
                      lineHeight: '1.4',
                      whiteSpace: 'pre',
                      tabSize: 2,
                      background: '#090d14'
                    }}
                    value={customScript}
                    onChange={(e) => {
                      setCustomScript(e.target.value);
                      if (type !== 'echart_script') setType('echart_script');
                    }}
                    placeholder="// Custom script returning ECharts option..."
                  />
                </div>

                {/* Right: Live Interactive ECharts Preview Canvas */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#090d14',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '8px'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Interactive Live Preview</span>
                    <span style={{ color: scriptError ? '#f43f5e' : '#10b981' }}>
                      {scriptError ? 'Error in Script' : 'Valid ECharts Option'}
                    </span>
                  </div>

                  {scriptError ? (
                    <div style={{
                      padding: '10px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: '4px',
                      color: '#f87171',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={14} />
                      <span>{scriptError}</span>
                    </div>
                  ) : (
                    <div 
                      ref={chartPreviewRef} 
                      style={{ width: '100%', height: '290px' }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Check size={14} /> Apply Widget Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
