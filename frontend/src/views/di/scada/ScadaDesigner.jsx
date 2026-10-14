import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Check, 
  AlertTriangle, Play, History, Layers, Box, Tag, 
  Settings, Trash2, Copy, Move, RotateCw, Eye, EyeOff, 
  Lock, Unlock, ArrowLeft, Plus, ChevronRight, ChevronDown, ChevronLeft,
  Search, Sliders, ShieldCheck, Activity, Terminal, CheckCircle2,
  Minimize2, RefreshCw, X, Radio, ArrowUpRight, GitBranch,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  FlipHorizontal, FlipVertical, Sparkles, FolderDown, Download,
  CornerDownRight, Compass, MousePointer, FolderTree
} from 'lucide-react';
import { 
  fetchScadaScreen, updateScadaScreen, validateScadaScreen, 
  publishScadaScreen, fetchScadaSymbols, fetchScadaValuesSnapshot,
  fetchScadaTemplates, fetchScadaAssets
} from '../../../api/client';
import AssetAttributeBrowser from '../../../components/AssetAttributeBrowser';
import { useDM } from '../../dm/dmContext';

// Helper: Calculate Port Anchor Position
function getElementPortPos(element, portId) {
  if (!element) return { x: 0, y: 0 };
  const w = element.width || 80;
  const h = element.height || 80;
  const x = element.x || 0;
  const y = element.y || 0;

  switch (portId) {
    case 'suction':
    case 'inlet':
    case 'left':
      return { x: x, y: y + h / 2 };
    case 'discharge':
    case 'outlet':
    case 'right':
      return { x: x + w, y: y + h / 2 };
    case 'top':
    case 'vent':
      return { x: x + w / 2, y: y };
    case 'bottom':
    case 'drain':
      return { x: x + w / 2, y: y + h };
    default:
      return { x: x + w / 2, y: y + h / 2 };
  }
}

// Helper: Compute Orthogonal Path
function computeOrthogonalPath(p1, p2) {
  if (!p1 || !p2) return '';
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

// Helper: Clean & Render SVG preview content safely for palette cards
export function renderSymbolSvgPreview(sym) {
  if (!sym) return '';
  let svg = sym.svg_content || sym.svg || '';
  // Strip any generated ns0: or ns\d+: namespace prefixes
  svg = svg.replace(/<\/?ns\d+:/gi, (m) => m.startsWith('</') ? '</' : '<');
  svg = svg.replace(/\sxmlns:ns\d+="[^"]*"/gi, '');
  if (!svg.includes('<svg')) {
    const w = sym.default_width || 80;
    const h = sym.default_height || 80;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${svg}</svg>`;
  }
  if (!svg.includes('xmlns=')) {
    svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  // Replace fixed width/height attributes so preview scales responsively
  svg = svg.replace(/(<svg[^>]*?)\s+width="[^"]*"/i, '$1 width="100%"');
  svg = svg.replace(/(<svg[^>]*?)\s+height="[^"]*"/i, '$1 height="100%"');
  return svg;
}

// Helper: Extract native viewBox from symbol definition to eliminate nested viewBox mismatches
export function getSymbolNativeViewBox(sym, elem) {
  if (!sym) return `0 0 ${elem?.width || 80} ${elem?.height || 80}`;
  const svg = sym.svg_content || sym.svg || '';
  const match = svg.match(/viewBox=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }
  const w = sym.default_width || elem?.width || 80;
  const h = sym.default_height || elem?.height || 80;
  return `0 0 ${w} ${h}`;
}

// Helper: Determine preserveAspectRatio so piping and linear elements stretch flush without side padding
export function getSymbolPreserveAspectRatio(sym, elem) {
  const symId = (elem?.symbol_id || sym?.id || '').toLowerCase();
  const cat = (sym?.category || '').toLowerCase();
  if (cat.includes('pip') || symId.includes('pipe') || symId.includes('line') || symId.includes('header') || symId.includes('duct')) {
    return 'none';
  }
  return 'xMidYMid meet';
}

// Helper: Extract inner SVG content without outer <svg> wrapper to prevent nested SVG clipping
export function extractSvgInner(svg) {
  if (!svg) return '';
  let clean = svg.replace(/<\/?ns\d+:/gi, (m) => m.startsWith('</') ? '</' : '<');
  clean = clean.replace(/\sxmlns:ns\d+="[^"]*"/gi, '');
  const start = clean.indexOf('>');
  const end = clean.lastIndexOf('</svg>');
  if (start !== -1 && end !== -1 && end > start) {
    return clean.substring(start + 1, end).trim();
  }
  return clean;
}

// Helper: Get available binding roles for a symbol/element
export function getAvailableRolesForElement(elem, sym) {
  const roles = [];
  const symId = (elem?.symbol_id || sym?.id || '').toLowerCase();
  
  if (symId.includes('badge') || symId.includes('readout') || symId.includes('gauge') || symId.includes('instrument')) {
    roles.push({ key: 'pv_value', label: 'Process Value (PV)', desc: 'Primary numeric/analog reading' });
    roles.push({ key: 'tag_name', label: 'Tag Name', desc: 'Equipment tag identifier (e.g. PT-101.PV)' });
    roles.push({ key: 'uom', label: 'Engineering Unit', desc: 'Unit of measure (e.g. bar, °C, m³/h)' });
    roles.push({ key: 'quality_led', label: 'Quality / Status LED', desc: 'Good/Bad/Alarm LED indicator' });
  } else if (symId.includes('tank') || symId.includes('vessel') || symId.includes('column')) {
    roles.push({ key: 'level_pct', label: 'Level (%)', desc: '0-100% liquid level height & readout' });
    roles.push({ key: 'high_alarm', label: 'High Alarm Limit', desc: 'High level alarm trigger threshold' });
    roles.push({ key: 'low_alarm', label: 'Low Alarm Limit', desc: 'Low level alarm trigger threshold' });
    roles.push({ key: 'temperature', label: 'Vessel Temperature', desc: 'Liquid bulk temperature' });
  } else if (symId.includes('pump') || symId.includes('motor') || symId.includes('comp') || symId.includes('fan')) {
    roles.push({ key: 'running', label: 'Running State (On/Off)', desc: 'Spins impeller / status light' });
    roles.push({ key: 'state_color', label: 'Status Light Color', desc: 'Green (Run) / Amber (Trip) / Slate' });
    roles.push({ key: 'head', label: 'Differential Head / Pressure', desc: 'Pump hydraulic discharge head' });
    roles.push({ key: 'vibration', label: 'Vibration (RMS)', desc: 'Bearing vibration health metric' });
    roles.push({ key: 'speed', label: 'Speed / RPM', desc: 'Rotational speed' });
  } else if (symId.includes('valve')) {
    roles.push({ key: 'opening_pct', label: 'Valve Position (%)', desc: '0-100% open percentage' });
    roles.push({ key: 'state_color', label: 'Status Indicator', desc: 'Open / Throttled / Closed' });
    roles.push({ key: 'command', label: 'Control Output (MV)', desc: 'DCS controller output demand' });
  } else {
    roles.push({ key: 'pv_value', label: 'Primary Value', desc: 'Primary sensor metric' });
    roles.push({ key: 'running', label: 'Running / Active State', desc: 'Discrete boolean state' });
    roles.push({ key: 'state_color', label: 'State Color', desc: 'Visual equipment highlight' });
  }

  // Also include triggers defined in symbol behaviors
  (sym?.behaviors || []).forEach(b => {
    if (b.trigger && !roles.some(r => r.key === b.trigger)) {
      roles.push({ key: b.trigger, label: `Behavior: ${b.trigger}`, desc: `Drives SVG ${b.type || 'behavior'} on ${b.target || 'target'}` });
    }
  });

  return roles;
}

// Helper: Dynamically replace values/tags in symbol SVG content
export function renderDynamicElementSvg(sym, elem, liveSnapshots = {}, assets = []) {
  if (!sym) return '';
  const rawSvg = sym.svg_content || sym.svg || '';
  let inner = extractSvgInner(rawSvg);
  if (!inner) return '';

  const bindings = elem.bindings || {};
  let tagName = '';
  let boundVal = null;
  let boundUom = '';
  let isRunning = false;
  let levelPct = null;
  let valvePos = null;

  // Extract from bindings
  const pvBinding = bindings.pv_value || bindings.value || bindings.pv || bindings.Flow || bindings.FlowRate || bindings.PRESSURE;
  const tagBinding = bindings.tag_name || bindings.tag;
  const uomBinding = bindings.uom || bindings.unit;
  const runBinding = bindings.running || bindings.isRunning || bindings.RunningStatus;
  const levelBinding = bindings.level_pct || bindings.level;
  const valveBinding = bindings.opening_pct || bindings.position || bindings.valve_position;

  // 1. Tag Name
  if (tagBinding?.tag_name) {
    tagName = tagBinding.tag_name;
  } else if (pvBinding?.tag_name) {
    tagName = pvBinding.tag_name;
  } else if (elem.label) {
    const m = elem.label.match(/[A-Z]{2,4}-\d+[A-Z]?/i);
    if (m) tagName = m[0].toUpperCase() + '.PV';
  }

  // 2. Value & UOM
  if (pvBinding) {
    const liveVal = pvBinding.tag_name ? liveSnapshots[pvBinding.tag_name]?.value : undefined;
    if (liveVal !== undefined && liveVal !== null) {
      boundVal = liveVal;
    } else if (pvBinding.value !== undefined && pvBinding.value !== null) {
      boundVal = pvBinding.value;
    }
    if (pvBinding.uom) boundUom = pvBinding.uom;
  }

  if (tagName && boundVal === null) {
    const liveVal = liveSnapshots[tagName]?.value;
    if (liveVal !== undefined && liveVal !== null) {
      boundVal = liveVal;
      if (liveSnapshots[tagName]?.uom) boundUom = liveSnapshots[tagName].uom;
    }
  }

  if (uomBinding?.uom) {
    boundUom = uomBinding.uom;
  }

  // 3. Level %
  if (levelBinding) {
    const liveLvl = levelBinding.tag_name ? liveSnapshots[levelBinding.tag_name]?.value : undefined;
    if (liveLvl !== undefined && liveLvl !== null) {
      levelPct = Number(liveLvl);
    } else if (levelBinding.value !== undefined && levelBinding.value !== null) {
      levelPct = Number(levelBinding.value);
    }
  }

  // 4. Running State
  if (runBinding) {
    const liveRun = runBinding.tag_name ? liveSnapshots[runBinding.tag_name]?.value : undefined;
    const rawRun = (liveRun !== undefined && liveRun !== null) ? liveRun : runBinding.value;
    isRunning = String(rawRun).toLowerCase() === 'true' || rawRun === 1 || String(rawRun).toUpperCase() === 'RUNNING';
  } else if (elem.symbol_id?.includes('pump') || elem.label?.toLowerCase().includes('pump')) {
    isRunning = true;
  }

  // 5. Valve Position
  if (valveBinding) {
    valvePos = Number(valveBinding.value || 100);
  }

  // Fallback defaults from element properties or labels
  if (boundVal === null && elem.properties?.value !== undefined) {
    boundVal = elem.properties.value;
  }
  if (!boundUom && elem.properties?.uom) {
    boundUom = elem.properties.uom;
  }

  // Sensible defaults based on equipment label so symbols never display dummy TIC-101 on pressure/flow indicators
  if (boundVal === null && (elem.symbol_id?.includes('badge') || elem.symbol_id?.includes('readout'))) {
    if (elem.label?.toLowerCase().includes('pressure') || elem.label?.includes('PT')) {
      boundVal = '4.8';
      if (!boundUom) boundUom = 'bar';
      if (!tagName) tagName = 'PT-101.PV';
    } else if (elem.label?.toLowerCase().includes('flow') || elem.label?.includes('FT')) {
      boundVal = '128.5';
      if (!boundUom) boundUom = 'm³/h';
      if (!tagName) tagName = 'FT-101.PV';
    } else if (elem.label?.toLowerCase().includes('temp') || elem.label?.includes('TT')) {
      boundVal = '84.2';
      if (!boundUom) boundUom = '°C';
      if (!tagName) tagName = 'TT-101.PV';
    }
  }

  if (levelPct === null && elem.symbol_id?.includes('tank')) {
    if (elem.properties?.level !== undefined) {
      levelPct = Number(elem.properties.level);
    } else if (elem.label?.includes('T-102')) {
      levelPct = 82.5;
    } else {
      levelPct = 65.0;
    }
  }

  // Perform SVG string replacements
  // A. Tag Name
  if (tagName) {
    inner = inner.replace(/(<text[^>]*id=["']tag_name["'][^>]*>)[^<]*(<\/text>)/gi, `$1${tagName}$2`);
  }

  // B. Value Display
  if (boundVal !== null && boundVal !== undefined) {
    const formatted = typeof boundVal === 'number' ? (Number.isInteger(boundVal) ? boundVal.toString() : boundVal.toFixed(1)) : String(boundVal);
    inner = inner.replace(/(<text[^>]*id=["'](?:value_display|value_text)["'][^>]*>)[^<]*(<\/text>)/gi, `$1${formatted}$2`);
  }

  // C. Unit Display
  if (boundUom) {
    inner = inner.replace(/(<text[^>]*id=["']unit_display["'][^>]*>)[^<]*(<\/text>)/gi, `$1${boundUom}$2`);
  }

  // D. Tank Level Text & Fill
  if (levelPct !== null) {
    const clamped = Math.max(0, Math.min(100, levelPct));
    inner = inner.replace(/(<text[^>]*id=["']level_text["'][^>]*>)[^<]*(<\/text>)/gi, `$1${clamped.toFixed(1)}%$2`);
    
    // Total fill height in sym-tank-vertical is 85, base y is 140
    const fillH = Math.round((clamped / 100) * 85);
    const fillY = 140 - fillH;
    inner = inner.replace(/(<rect[^>]*id=["']level_fill["'][^>]*?)y=["'][^"']*["']([^>]*?)height=["'][^"']*["']/gi, `$1y="${fillY}"$2height="${fillH}"`);
    inner = inner.replace(/(<rect[^>]*id=["']level_fill["'][^>]*?)height=["'][^"']*["']([^>]*?)y=["'][^"']*["']/gi, `$1height="${fillH}"$2y="${fillY}"`);
  }

  // E. Status Light / LED
  const statusColor = isRunning ? '#10b981' : (elem.properties?.stoppedColor || '#64748b');
  inner = inner.replace(/(<circle[^>]*id=["'](?:status_light|status_indicator|quality_led)["'][^>]*?)fill=["'][^"']*["']/gi, `$1fill="${statusColor}"`);

  // F. Impeller Animation
  if (isRunning) {
    inner = inner.replace(/<g[^>]*id=["']impeller["']/gi, (match) => {
      if (!match.includes('animated-impeller-spin')) {
        return match.replace(/class=["']([^"']*)["']/i, 'class="$1 animated-impeller-spin"');
      }
      return match;
    });
  }

  // G. Valve Position Label
  if (valvePos !== null) {
    inner = inner.replace(/(<text[^>]*id=["']position_label["'][^>]*>)[^<]*(<\/text>)/gi, `$1${valvePos}%$2`);
  }

  return inner;
}

export default function ScadaDesigner({ 
  screenId, 
  onBack, 
  onLaunchRuntime, 
  onOpenVersions,
  onOpenTemplates,
  onOpenSymbolLibrary,
  onNavigateToDM
}) {
  const { assets = [] } = useDM();

  // Screen State
  const [screen, setScreen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [symbols, setSymbols] = useState([]);
  
  // Selection State (Multi-Select Support)
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  
  // Active Tool Mode: 'select' | 'pipe'
  const [activeTool, setActiveTool] = useState('select');
  
  // Piping Connection Draft State
  const [connectingFrom, setConnectingFrom] = useState(null); // { elementId, portId, x, y }
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });

  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Grid & Snap Settings
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);

  // Panel Collapsible States (Fixes layout overflow in DI)
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isBottomOpen, setIsBottomOpen] = useState(false);

  // Active Tabs
  const [leftTab, setLeftTab] = useState('symbols'); // 'symbols' | 'layers' | 'assets'
  const [rightTab, setRightTab] = useState('properties'); // 'properties' | 'binding' | 'pipe' | 'behaviors'
  const [bottomTab, setBottomTab] = useState('inspector'); // 'inspector' | 'validation' | 'stats'
  const [symbolCategory, setSymbolCategory] = useState('ALL');
  const [symbolSearch, setSymbolSearch] = useState('');

  // Diagnostic & Live Snapshots
  const [validationResult, setValidationResult] = useState(null);
  const [liveSnapshots, setLiveSnapshots] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [saveMessage, setSaveMessage] = useState('');

  // Template Quick Insert Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  // Dragging Elements State
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elementStarts: {} });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Asset Attribute Binding Controls State
  const [bindingRole, setBindingRole] = useState('pv_value');
  const [bindingAssetId, setBindingAssetId] = useState('');
  const [bindingAttrId, setBindingAttrId] = useState('');
  const [manualTag, setManualTag] = useState('');
  const [manualVal, setManualVal] = useState('');
  const [manualUom, setManualUom] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load of Screen & Symbols
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setLoading(true);
        const [screenData, symbolsData] = await Promise.all([
          fetchScadaScreen(screenId),
          fetchScadaSymbols()
        ]);
        if (!isMounted) return;
        
        // Ensure connections array exists
        if (!screenData.connections) {
          screenData.connections = [];
        }

        setScreen(screenData);
        setSymbols(symbolsData);
        setHistory([JSON.stringify({ elements: screenData.elements || [], connections: screenData.connections || [] })]);
        setHistoryIndex(0);

        // Fetch live snapshot for mapped tags
        refreshLiveSnapshot(screenData.elements || []);

        // Auto-fit process diagram to visible viewport
        setTimeout(() => {
          handleFitToScreen(screenData);
        }, 100);
      } catch (err) {
        console.error('Failed to load screen in designer:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [screenId]);

  // Record history snapshot
  const recordHistory = useCallback((nextElements, nextConnections) => {
    const el = nextElements !== undefined ? nextElements : (screen?.elements || []);
    const cn = nextConnections !== undefined ? nextConnections : (screen?.connections || []);
    const serialized = JSON.stringify({ elements: el, connections: cn });
    const updated = history.slice(0, historyIndex + 1);
    updated.push(serialized);
    if (updated.length > 50) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
  }, [history, historyIndex, screen]);

  // Undo / Redo
  const undo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const parsed = JSON.parse(history[targetIndex]);
      setScreen(prev => ({ ...prev, elements: parsed.elements, connections: parsed.connections || [] }));
      setHistoryIndex(targetIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const parsed = JSON.parse(history[targetIndex]);
      setScreen(prev => ({ ...prev, elements: parsed.elements, connections: parsed.connections || [] }));
      setHistoryIndex(targetIndex);
    }
  };

  // Live Snapshot Refresh
  const refreshLiveSnapshot = async (elements) => {
    const tags = new Set();
    elements.forEach(el => {
      Object.values(el.bindings || {}).forEach(b => {
        if (b.tag_name) tags.add(b.tag_name);
      });
    });
    if (tags.size === 0) return;
    try {
      const snap = await fetchScadaValuesSnapshot(Array.from(tags));
      setLiveSnapshots(snap);
    } catch (err) {
      console.warn('Failed to fetch snapshot:', err);
    }
  };

  // Save Screen Draft
  const handleSaveDraft = async () => {
    if (!screen) return;
    setSaveStatus('saving');
    try {
      await updateScadaScreen(screenId, {
        name: screen.name,
        description: screen.description,
        width: screen.width,
        height: screen.height,
        background: screen.background,
        elements: screen.elements,
        connections: screen.connections || []
      });
      setSaveStatus('saved');
      setSaveMessage('Draft saved successfully');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveMessage(err.message || 'Save failed');
    }
  };

  // Validate Screen
  const handleValidate = async () => {
    try {
      const res = await validateScadaScreen(screenId);
      setValidationResult(res);
      setIsBottomOpen(true);
      setBottomTab('validation');
    } catch (err) {
      console.error('Validation error:', err);
    }
  };

  // Publish Screen
  const handlePublish = async () => {
    if (!window.confirm('Publishing will create an immutable version snapshot accessible to the runtime viewer. Continue?')) return;
    try {
      await handleSaveDraft();
      const snap = await publishScadaScreen(screenId, { changelog: 'Published from SCADA Studio V2' });
      alert(`Published release version ${snap.version} successfully!`);
      const updated = await fetchScadaScreen(screenId);
      setScreen(updated);
    } catch (err) {
      alert(`Publish failed: ${err.message}`);
    }
  };

  // Fit Canvas Elements to Viewport
  const handleFitToScreen = useCallback((targetScreen) => {
    const s = targetScreen || screen;
    if (!canvasRef.current || !s) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const elements = s.elements || [];
    if (elements.length > 0) {
      const minX = Math.min(...elements.map(e => e.x));
      const maxX = Math.max(...elements.map(e => e.x + (e.width || 80)));
      const minY = Math.min(...elements.map(e => e.y));
      const maxY = Math.max(...elements.map(e => e.y + (e.height || 80)));

      const contentW = Math.max(250, maxX - minX);
      const contentH = Math.max(180, maxY - minY);
      const padding = 70;

      const availW = Math.max(150, rect.width - padding * 2);
      const availH = Math.max(150, rect.height - padding * 2);

      const scaleX = availW / contentW;
      const scaleY = availH / contentH;
      const newZoom = Math.max(0.35, Math.min(1.25, Math.min(scaleX, scaleY)));

      const centerDiagramX = minX + contentW / 2;
      const centerDiagramY = minY + contentH / 2;

      const newPanX = rect.width / 2 - centerDiagramX * newZoom;
      const newPanY = rect.height / 2 - centerDiagramY * newZoom;

      setZoom(Number(newZoom.toFixed(2)));
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    } else {
      const scale = Math.min((rect.width - 80) / (s.width || 1920), (rect.height - 80) / (s.height || 1080));
      const newZoom = Math.max(0.2, Math.min(1.0, scale));
      setZoom(Number(newZoom.toFixed(2)));
      setPan({
        x: Math.round((rect.width - (s.width || 1920) * newZoom) / 2),
        y: Math.round((rect.height - (s.height || 1080) * newZoom) / 2)
      });
    }
  }, [screen]);

  // Add Symbol to Canvas at specific coordinates
  const handleAddSymbolAt = (symbol, targetX, targetY) => {
    if (!screen || !symbol) return;
    const newId = `inst-${symbol.id.replace('sym-', '')}-${Date.now().toString(36)}`;
    
    const w = symbol.default_width || 80;
    const h = symbol.default_height || 80;

    let posX = Math.max(10, Math.round(targetX - w / 2));
    let posY = Math.max(10, Math.round(targetY - h / 2));
    if (snapToGrid) {
      posX = Math.round(posX / gridSize) * gridSize;
      posY = Math.round(posY / gridSize) * gridSize;
    }

    const newElement = {
      instance_id: newId,
      symbol_id: symbol.id,
      label: symbol.name,
      x: posX,
      y: posY,
      width: w,
      height: h,
      rotation: 0,
      flipH: false,
      flipV: false,
      layer: (screen.elements?.length || 0) + 1,
      is_locked: false,
      is_hidden: false,
      bindings: {},
      properties: { ...(symbol.properties || {}) },
      actions: { onClick: 'OPEN_TREND' }
    };

    const nextElements = [...(screen.elements || []), newElement];
    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
    setSelectedElementIds([newId]);
    setSelectedConnectionId(null);
    setRightTab('properties');
    showToast(`Added ${symbol.name}`);
  };

  // Add Symbol to Canvas at center
  const handleAddSymbol = (symbol) => {
    const centerX = (-pan.x + 350) / zoom;
    const centerY = (-pan.y + 250) / zoom;
    handleAddSymbolAt(symbol, centerX, centerY);
  };

  // Convert client mouse event to screen SVG coordinates
  const getCanvasCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const x = (mouseX - pan.x) / zoom;
    const y = (mouseY - pan.y) / zoom;
    return { x, y };
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e) => {
    // Cancel pipe connection if clicked on empty canvas
    if (connectingFrom && activeTool === 'pipe') {
      setConnectingFrom(null);
      return;
    }

    // Middle click, Alt key, or dragging on empty canvas background -> Pan
    if (e.button === 1 || e.altKey || e.target === canvasRef.current || e.target.id === 'canvas-bg-rect') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedElementIds([]);
      setSelectedConnectionId(null);
      return;
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    setMouseCanvasPos(coords);

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (isDraggingElement && selectedElementIds.length > 0) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;

      setScreen(prev => {
        const nextElements = prev.elements.map(el => {
          if (dragStartRef.current.elementStarts[el.instance_id]) {
            const start = dragStartRef.current.elementStarts[el.instance_id];
            let newX = start.x + dx;
            let newY = start.y + dy;
            if (snapToGrid) {
              newX = Math.round(newX / gridSize) * gridSize;
              newY = Math.round(newY / gridSize) * gridSize;
            }
            return { ...el, x: Math.max(0, newX), y: Math.max(0, newY) };
          }
          return el;
        });
        return { ...prev, elements: nextElements };
      });
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDraggingElement) {
      setIsDraggingElement(false);
      if (screen) recordHistory(screen.elements, screen.connections);
    }
  };

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(prev => Math.min(3.0, Math.max(0.2, Number((prev * zoomFactor).toFixed(2)))));
    }
  };

  // Element Selection & Drag Start
  const handleElementMouseDown = (e, elemId) => {
    e.stopPropagation();
    
    // In Pipe tool mode, clicking an element's port handled separately
    if (activeTool === 'pipe') return;

    let nextSelected = [...selectedElementIds];
    if (e.shiftKey) {
      if (nextSelected.includes(elemId)) {
        nextSelected = nextSelected.filter(id => id !== elemId);
      } else {
        nextSelected.push(elemId);
      }
    } else {
      if (!nextSelected.includes(elemId)) {
        nextSelected = [elemId];
      }
    }

    setSelectedElementIds(nextSelected);
    setSelectedConnectionId(null);
    setIsDraggingElement(true);

    const starts = {};
    (screen.elements || []).forEach(el => {
      if (nextSelected.includes(el.instance_id)) {
        starts[el.instance_id] = { x: el.x, y: el.y };
      }
    });

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elementStarts: starts
    };
  };

  // Port Click Handler for Smart Piping
  const handlePortClick = (e, element, portId) => {
    e.stopPropagation();
    const portPos = getElementPortPos(element, portId);

    if (!connectingFrom) {
      // Start connection
      setConnectingFrom({
        elementId: element.instance_id,
        portId: portId,
        x: portPos.x,
        y: portPos.y
      });
    } else {
      // Complete connection
      if (connectingFrom.elementId === element.instance_id && connectingFrom.portId === portId) {
        setConnectingFrom(null);
        return;
      }

      const newConnection = {
        id: `pipe-${Date.now().toString(36)}`,
        from_id: connectingFrom.elementId,
        from_port: connectingFrom.portId,
        to_id: element.instance_id,
        to_port: portId,
        routing: 'ORTHOGONAL',
        line_style: 'SOLID',
        animated: true,
        color: '#06b6d4',
        stroke_width: 3,
        label: 'Process Pipe',
        flow_rate: 1.0
      };

      const nextConns = [...(screen.connections || []), newConnection];
      setScreen(prev => ({ ...prev, connections: nextConns }));
      recordHistory(screen.elements, nextConns);
      setConnectingFrom(null);
      setSelectedConnectionId(newConnection.id);
      setSelectedElementIds([]);
      setRightTab('pipe');
    }
  };

  // Alignment Tools for Multi-Select
  const handleAlign = (alignment) => {
    if (selectedElementIds.length < 2 || !screen) return;
    const selected = screen.elements.filter(el => selectedElementIds.includes(el.instance_id));
    if (selected.length < 2) return;

    let targetVal = 0;
    const nextElements = screen.elements.map(el => {
      if (!selectedElementIds.includes(el.instance_id)) return el;

      switch (alignment) {
        case 'left': {
          const minX = Math.min(...selected.map(s => s.x));
          return { ...el, x: minX };
        }
        case 'center': {
          const avgCenter = selected.reduce((acc, s) => acc + (s.x + s.width / 2), 0) / selected.length;
          return { ...el, x: Math.round(avgCenter - el.width / 2) };
        }
        case 'right': {
          const maxRight = Math.max(...selected.map(s => s.x + s.width));
          return { ...el, x: maxRight - el.width };
        }
        case 'top': {
          const minY = Math.min(...selected.map(s => s.y));
          return { ...el, y: minY };
        }
        case 'middle': {
          const avgMiddle = selected.reduce((acc, s) => acc + (s.y + s.height / 2), 0) / selected.length;
          return { ...el, y: Math.round(avgMiddle - el.height / 2) };
        }
        case 'bottom': {
          const maxBottom = Math.max(...selected.map(s => s.y + s.height));
          return { ...el, y: maxBottom - el.height };
        }
        default:
          return el;
      }
    });

    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
  };

  // Distribute Tools
  const handleDistribute = (direction) => {
    if (selectedElementIds.length < 3 || !screen) return;
    const selected = screen.elements.filter(el => selectedElementIds.includes(el.instance_id));
    if (selected.length < 3) return;

    if (direction === 'horizontal') {
      selected.sort((a, b) => a.x - b.x);
      const minX = selected[0].x;
      const maxX = selected[selected.length - 1].x;
      const totalSpacing = maxX - minX;
      const step = totalSpacing / (selected.length - 1);

      const posMap = {};
      selected.forEach((s, idx) => {
        posMap[s.instance_id] = Math.round(minX + idx * step);
      });

      const nextElements = screen.elements.map(el => 
        posMap[el.instance_id] !== undefined ? { ...el, x: posMap[el.instance_id] } : el
      );
      setScreen(prev => ({ ...prev, elements: nextElements }));
      recordHistory(nextElements, screen.connections);
    } else {
      selected.sort((a, b) => a.y - b.y);
      const minY = selected[0].y;
      const maxY = selected[selected.length - 1].y;
      const totalSpacing = maxY - minY;
      const step = totalSpacing / (selected.length - 1);

      const posMap = {};
      selected.forEach((s, idx) => {
        posMap[s.instance_id] = Math.round(minY + idx * step);
      });

      const nextElements = screen.elements.map(el => 
        posMap[el.instance_id] !== undefined ? { ...el, y: posMap[el.instance_id] } : el
      );
      setScreen(prev => ({ ...prev, elements: nextElements }));
      recordHistory(nextElements, screen.connections);
    }
  };

  // Duplicate Selected
  const handleDuplicate = () => {
    if (selectedElementIds.length === 0 || !screen) return;
    const duplicates = [];
    const newSelected = [];

    screen.elements.forEach(el => {
      if (selectedElementIds.includes(el.instance_id)) {
        const newId = `inst-dup-${Date.now().toString(36)}-${Math.floor(Math.random() * 100)}`;
        newSelected.push(newId);
        duplicates.push({
          ...el,
          instance_id: newId,
          label: `${el.label || 'Equipment'} (Copy)`,
          x: el.x + 30,
          y: el.y + 30
        });
      }
    });

    const nextElements = [...screen.elements, ...duplicates];
    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
    setSelectedElementIds(newSelected);
  };

  // Flip & Rotate
  const handleFlip = (direction) => {
    if (selectedElementIds.length === 0 || !screen) return;
    const nextElements = screen.elements.map(el => {
      if (selectedElementIds.includes(el.instance_id)) {
        if (direction === 'horizontal') return { ...el, flipH: !el.flipH };
        if (direction === 'vertical') return { ...el, flipV: !el.flipV };
      }
      return el;
    });
    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
  };

  const handleRotate = (angleDelta) => {
    if (selectedElementIds.length === 0 || !screen) return;
    const nextElements = screen.elements.map(el => {
      if (selectedElementIds.includes(el.instance_id)) {
        const curAngle = el.rotation || 0;
        return { ...el, rotation: (curAngle + angleDelta + 360) % 360 };
      }
      return el;
    });
    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
  };

  // Delete Selected Elements or Connections
  const handleDeleteSelected = () => {
    if (!screen) return;
    let nextElements = [...screen.elements];
    let nextConns = [...(screen.connections || [])];

    if (selectedElementIds.length > 0) {
      nextElements = nextElements.filter(el => !selectedElementIds.includes(el.instance_id));
      // Also remove attached pipes
      nextConns = nextConns.filter(c => 
        !selectedElementIds.includes(c.from_id) && !selectedElementIds.includes(c.to_id)
      );
      setSelectedElementIds([]);
    }

    if (selectedConnectionId) {
      nextConns = nextConns.filter(c => c.id !== selectedConnectionId);
      setSelectedConnectionId(null);
    }

    setScreen(prev => ({ ...prev, elements: nextElements, connections: nextConns }));
    recordHistory(nextElements, nextConns);
  };

  // Quick Insert Template
  const openTemplateModal = async () => {
    try {
      const tpls = await fetchScadaTemplates();
      setAvailableTemplates(tpls);
      setShowTemplateModal(true);
    } catch (e) {
      console.warn('Failed to load templates:', e);
    }
  };

  const handleInsertTemplate = (tpl) => {
    if (!screen || !tpl) return;
    const offsetX = Math.max(40, (-pan.x + 200) / zoom);
    const offsetY = Math.max(40, (-pan.y + 150) / zoom);

    const idMap = {};
    const newElements = (tpl.elements || []).map((el, i) => {
      const newInstId = `inst-${tpl.id.replace('tpl-', '')}-${i}-${Date.now().toString(36)}`;
      idMap[el.instance_id] = newInstId;
      return {
        ...el,
        instance_id: newInstId,
        x: Math.round(el.x + offsetX),
        y: Math.round(el.y + offsetY)
      };
    });

    const newConns = (tpl.connections || []).map((cn, i) => ({
      ...cn,
      id: `pipe-tpl-${i}-${Date.now().toString(36)}`,
      from_id: idMap[cn.from_id] || cn.from_id,
      to_id: idMap[cn.to_id] || cn.to_id
    }));

    const nextElements = [...screen.elements, ...newElements];
    const nextConns = [...(screen.connections || []), ...newConns];

    setScreen(prev => ({ ...prev, elements: nextElements, connections: nextConns }));
    recordHistory(nextElements, nextConns);
    setShowTemplateModal(false);
  };

  // Primary selected element
  const primarySelected = useMemo(() => {
    if (selectedElementIds.length === 0 || !screen) return null;
    return screen.elements.find(el => el.instance_id === selectedElementIds[0]) || null;
  }, [screen, selectedElementIds]);

  // Selected Connection
  const selectedConnection = useMemo(() => {
    if (!selectedConnectionId || !screen) return null;
    return (screen.connections || []).find(c => c.id === selectedConnectionId) || null;
  }, [screen, selectedConnectionId]);

  // Update property of primary selected element
  const updatePrimaryElement = (field, value) => {
    if (!primarySelected || !screen) return;
    const nextElements = screen.elements.map(el => {
      if (el.instance_id === primarySelected.instance_id) {
        return { ...el, [field]: value };
      }
      return el;
    });
    setScreen(prev => ({ ...prev, elements: nextElements }));
  };

  // Synchronize binding inspector state with selected equipment
  useEffect(() => {
    if (primarySelected) {
      const sym = symbols.find(s => s.id === primarySelected.symbol_id);
      const roles = getAvailableRolesForElement(primarySelected, sym);
      if (roles.length > 0 && !roles.some(r => r.key === bindingRole)) {
        setBindingRole(roles[0].key);
      }
      const firstBound = Object.values(primarySelected.bindings || {})[0];
      if (firstBound?.asset_id) {
        setBindingAssetId(firstBound.asset_id);
      } else if (assets.length > 0 && !bindingAssetId) {
        setBindingAssetId(assets[0].id);
      }
    }
  }, [primarySelected, symbols, assets]);

  // Bind attribute to specific role from right inspector
  const handleBindRole = (roleKey, attr, asset) => {
    if (!primarySelected || !attr) return;
    const updatedBindings = {
      ...(primarySelected.bindings || {}),
      [roleKey]: {
        mode: 'DYNAMIC',
        asset_id: asset?.id || attr.asset_id,
        asset_name: asset?.name || attr.asset_name,
        attribute_id: attr.id || attr.attribute_id,
        attribute_name: attr.name || attr.attribute_name,
        tag_name: attr.tag_name || `${asset?.name || ''}.${attr.name}`,
        uom: attr.uom || '',
        data_type: attr.data_type || 'Float',
        value: attr.value,
        quality: attr.quality || 'Good'
      }
    };

    if (roleKey === 'pv_value') {
      if (!updatedBindings.tag_name && (attr.tag_name || attr.name)) {
        updatedBindings.tag_name = {
          mode: 'DYNAMIC',
          tag_name: attr.tag_name || attr.name
        };
      }
      if (!updatedBindings.uom && attr.uom) {
        updatedBindings.uom = {
          mode: 'DYNAMIC',
          uom: attr.uom
        };
      }
    }

    updatePrimaryElement('bindings', updatedBindings);
    recordHistory(screen.elements, screen.connections);
    showToast(`Mapped role "${roleKey}" to ${attr.name}`);
    if (attr.tag_name) {
      refreshLiveSnapshot([{ bindings: updatedBindings }]);
    }
  };

  // Auto-map all matching roles from an asset
  const handleAutoMapRoles = (targetElement, asset) => {
    if (!targetElement || !asset || !asset.attributes?.length) return;
    const sym = symbols.find(s => s.id === targetElement.symbol_id);
    const roles = getAvailableRolesForElement(targetElement, sym);
    const updatedBindings = { ...(targetElement.bindings || {}) };

    asset.attributes.forEach(attr => {
      const aName = (attr.name || '').toLowerCase();
      const aTag = (attr.tag_name || '').toLowerCase();
      
      roles.forEach(r => {
        let match = false;
        if (r.key === 'pv_value' && (aName.includes('press') || aName.includes('flow') || aName.includes('temp') || aName.includes('pv') || aTag.includes('pv'))) match = true;
        if (r.key === 'level_pct' && (aName.includes('level') || aTag.includes('lic') || aTag.includes('lt'))) match = true;
        if (r.key === 'running' && (aName.includes('run') || aName.includes('status') || attr.data_type === 'Boolean')) match = true;
        if (r.key === 'head' && (aName.includes('head') || aName.includes('diff'))) match = true;
        if (r.key === 'vibration' && aName.includes('vib')) match = true;
        if (r.key === 'opening_pct' && (aName.includes('pos') || aName.includes('open'))) match = true;
        
        if (match && !updatedBindings[r.key]) {
          updatedBindings[r.key] = {
            mode: 'DYNAMIC',
            asset_id: asset.id,
            asset_name: asset.name,
            attribute_id: attr.id,
            attribute_name: attr.name,
            tag_name: attr.tag_name || `${asset.name}.${attr.name}`,
            uom: attr.uom || '',
            value: attr.value
          };
        }
      });
    });

    updatePrimaryElement('bindings', updatedBindings);
    recordHistory(screen.elements, screen.connections);
    showToast(`Auto-mapped attributes from ${asset.name}`);
  };

  // Unbind a role
  const handleUnbindRole = (roleKey) => {
    if (!primarySelected || !primarySelected.bindings) return;
    const nextBindings = { ...primarySelected.bindings };
    delete nextBindings[roleKey];
    updatePrimaryElement('bindings', nextBindings);
    recordHistory(screen.elements, screen.connections);
    showToast(`Unbound role "${roleKey}"`);
  };

  // Smart attribute binder: maps an attribute to an element based on equipment type
  const handleBindAttributeSmart = (targetElement, attr) => {
    if (!targetElement || !attr) return;
    const symId = (targetElement.symbol_id || '').toLowerCase();
    const updatedBindings = { ...(targetElement.bindings || {}) };

    if (symId.includes('badge') || symId.includes('readout') || symId.includes('gauge') || symId.includes('instrument')) {
      updatedBindings.pv_value = {
        mode: 'DYNAMIC',
        asset_id: attr.asset_id,
        asset_name: attr.asset_name,
        attribute_id: attr.id || attr.attribute_id,
        attribute_name: attr.name || attr.attribute_name,
        tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
        uom: attr.uom || '',
        data_type: attr.data_type || 'Float',
        value: attr.value,
        quality: attr.quality || 'Good'
      };
      updatedBindings.tag_name = {
        mode: 'DYNAMIC',
        tag_name: attr.tag_name || attr.name || `${attr.asset_name}.${attr.name}`
      };
      if (attr.uom) {
        updatedBindings.uom = {
          mode: 'DYNAMIC',
          uom: attr.uom
        };
      }
    } else if (symId.includes('tank') || symId.includes('vessel')) {
      updatedBindings.level_pct = {
        mode: 'DYNAMIC',
        asset_id: attr.asset_id,
        asset_name: attr.asset_name,
        attribute_id: attr.id || attr.attribute_id,
        attribute_name: attr.name || attr.attribute_name,
        tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
        uom: attr.uom || '%',
        value: attr.value
      };
    } else if (symId.includes('pump') || symId.includes('motor') || symId.includes('comp')) {
      const isBool = (attr.data_type || '').toLowerCase() === 'boolean' || (attr.name || '').toLowerCase().includes('run');
      if (isBool) {
        updatedBindings.running = {
          mode: 'DYNAMIC',
          asset_id: attr.asset_id,
          asset_name: attr.asset_name,
          attribute_id: attr.id || attr.attribute_id,
          attribute_name: attr.name || attr.attribute_name,
          tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
          value: attr.value || true
        };
      } else {
        updatedBindings.head = {
          mode: 'DYNAMIC',
          asset_id: attr.asset_id,
          asset_name: attr.asset_name,
          attribute_id: attr.id || attr.attribute_id,
          attribute_name: attr.name || attr.attribute_name,
          tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
          uom: attr.uom || 'm',
          value: attr.value
        };
      }
    } else if (symId.includes('valve')) {
      updatedBindings.opening_pct = {
        mode: 'DYNAMIC',
        asset_id: attr.asset_id,
        asset_name: attr.asset_name,
        attribute_id: attr.id || attr.attribute_id,
        attribute_name: attr.name || attr.attribute_name,
        tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
        uom: attr.uom || '%',
        value: attr.value
      };
    } else {
      updatedBindings.pv_value = {
        mode: 'DYNAMIC',
        asset_id: attr.asset_id,
        asset_name: attr.asset_name,
        attribute_id: attr.id || attr.attribute_id,
        attribute_name: attr.name || attr.attribute_name,
        tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
        uom: attr.uom || '',
        value: attr.value
      };
    }

    const nextElements = screen.elements.map(el => {
      if (el.instance_id === targetElement.instance_id) {
        return { ...el, bindings: updatedBindings };
      }
      return el;
    });

    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
    showToast(`Bound "${attr.name || attr.tag_name}" to ${targetElement.label || targetElement.instance_id}`);
    
    if (attr.tag_name) {
      refreshLiveSnapshot([{ bindings: updatedBindings }]);
    }
  };

  // Create badge element when attribute is dropped on empty canvas
  const handleCreateBadgeForAttribute = (attr, dropX, dropY) => {
    const badgeSym = symbols.find(s => s.id === 'sym-instrument-badge') || symbols.find(s => s.category === 'Instruments') || symbols[0];
    if (!badgeSym) return;
    const newId = `inst-badge-${Date.now().toString(36)}`;
    const w = 135;
    const h = 65;
    let posX = Math.max(10, Math.round(dropX - w / 2));
    let posY = Math.max(10, Math.round(dropY - h / 2));
    if (snapToGrid) {
      posX = Math.round(posX / gridSize) * gridSize;
      posY = Math.round(posY / gridSize) * gridSize;
    }

    const newElement = {
      instance_id: newId,
      symbol_id: badgeSym.id,
      label: attr.name || attr.tag_name,
      x: posX,
      y: posY,
      width: w,
      height: h,
      rotation: 0,
      flipH: false,
      flipV: false,
      layer: (screen.elements?.length || 0) + 1,
      is_locked: false,
      is_hidden: false,
      bindings: {
        pv_value: {
          mode: 'DYNAMIC',
          asset_id: attr.asset_id,
          asset_name: attr.asset_name,
          attribute_id: attr.id || attr.attribute_id,
          attribute_name: attr.name || attr.attribute_name,
          tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
          uom: attr.uom || '',
          value: attr.value
        },
        tag_name: {
          mode: 'DYNAMIC',
          tag_name: attr.tag_name || attr.name
        },
        uom: {
          mode: 'DYNAMIC',
          uom: attr.uom || ''
        }
      },
      properties: { ...(badgeSym.properties || {}) },
      actions: { onClick: 'OPEN_TREND' }
    };

    const nextElements = [...(screen.elements || []), newElement];
    setScreen(prev => ({ ...prev, elements: nextElements }));
    recordHistory(nextElements, screen.connections);
    setSelectedElementIds([newId]);
    setSelectedConnectionId(null);
    setRightTab('binding');
    showToast(`Instantiated indicator for ${attr.name}`);
  };

  // Drop attribute directly on canvas element
  const handleDropOnElement = (e, targetElement) => {
    const attrData = e.dataTransfer.getData('application/scada-attribute');
    if (!attrData) return;
    try {
      const attr = JSON.parse(attrData);
      handleBindAttributeSmart(targetElement, attr);
    } catch (err) {
      console.error('Failed to handle dropped attribute:', err);
    }
  };

  // Update connection property
  const updateSelectedConnection = (field, value) => {
    if (!selectedConnection || !screen) return;
    const nextConns = (screen.connections || []).map(c => {
      if (c.id === selectedConnection.id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setScreen(prev => ({ ...prev, connections: nextConns }));
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedElementIds([]);
        setSelectedConnectionId(null);
        setConnectingFrom(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, selectedConnectionId, historyIndex, history, screen]);

  // Filtered symbols
  const filteredSymbols = useMemo(() => {
    return symbols.filter(s => {
      if (symbolCategory !== 'ALL' && s.category !== symbolCategory) return false;
      if (symbolSearch.trim()) {
        const q = symbolSearch.toLowerCase();
        return (s.name || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [symbols, symbolCategory, symbolSearch]);

  const symbolCategories = [
    'ALL', 
    '3D Equipment', 
    'Water Treatment & Pool', 
    'Pumps', 
    'Valves', 
    'Tanks', 
    'Rotating Equipment', 
    'Thermal Equipment', 
    'Instrumentation', 
    'Piping', 
    'Electrical', 
    'Material Handling', 
    'HMI Controls'
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#020617] text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin text-cyan-400" />
        <span>Loading SCADA Studio Canvas...</span>
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020617] text-slate-400 gap-3">
        <AlertTriangle size={32} className="text-amber-400" />
        <span>Screen not found</span>
        <button onClick={onBack} className="px-3 py-1.5 rounded bg-slate-800 text-slate-200 text-xs">
          Back to Screens
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-[#020617] text-slate-100 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* TOP CANVAS TOOLBAR                                                    */}
      {/* ===================================================================== */}
      <div className="h-11 border-b border-slate-800 bg-slate-900/95 px-3 flex items-center justify-between z-20 shrink-0 gap-2">
        {/* Left: Screen identity & back */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Back to Screens"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white truncate max-w-[160px]">{screen.name}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${
              screen.status === 'PUBLISHED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {screen.status}
            </span>
          </div>
        </div>

        {/* Center: Tools (Select, Smart Pipe, Multi-Align, Duplicate, Zoom) */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          {/* Tool Modes */}
          <button
            onClick={() => { setActiveTool('select'); setConnectingFrom(null); }}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              activeTool === 'select' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Select & Move Tool (V)"
          >
            <MousePointer size={13} />
            <span className="hidden sm:inline">Select</span>
          </button>

          <button
            onClick={() => { setActiveTool('pipe'); setSelectedElementIds([]); }}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              activeTool === 'pipe' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Smart Pipe Routing Tool (P)"
          >
            <GitBranch size={13} />
            <span className="hidden sm:inline">Smart Pipe</span>
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={13} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={13} />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

          {/* Alignment Tools (Enabled if multiple selected) */}
          <button
            onClick={() => handleAlign('left')}
            disabled={selectedElementIds.length < 2}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
            title="Align Left"
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => handleAlign('center')}
            disabled={selectedElementIds.length < 2}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
            title="Align Center Horizontal"
          >
            <AlignCenter size={13} />
          </button>
          <button
            onClick={() => handleAlign('right')}
            disabled={selectedElementIds.length < 2}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
            title="Align Right"
          >
            <AlignRight size={13} />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

          {/* Flip & Rotate */}
          <button
            onClick={() => handleFlip('horizontal')}
            disabled={selectedElementIds.length === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
            title="Flip Horizontal"
          >
            <FlipHorizontal size={13} />
          </button>
          <button
            onClick={() => handleRotate(90)}
            disabled={selectedElementIds.length === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
            title="Rotate 90° Clockwise"
          >
            <RotateCw size={13} />
          </button>
          <button
            onClick={handleDuplicate}
            disabled={selectedElementIds.length === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
            title="Duplicate (Ctrl+D)"
          >
            <Copy size={13} />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

          {/* Zoom & Fit */}
          <button
            onClick={() => setZoom(prev => Math.max(0.2, Number((prev - 0.1).toFixed(2))))}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] font-mono text-slate-300 px-1 min-w-[38px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(3.0, Number((prev + 0.1).toFixed(2))))}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={handleFitToScreen}
            className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded text-[10px] font-mono border border-slate-800 hover:bg-slate-800"
            title="Fit to Screen"
          >
            Fit
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
              snapToGrid ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-500'
            }`}
            title="Toggle Snap to Grid (20px)"
          >
            Snap
          </button>
        </div>

        {/* Right: Insert Template, Validate, Runtime Preview, Publish & Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={openTemplateModal}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Insert Pre-Engineered Process Skid"
          >
            <Sparkles size={13} className="text-cyan-400" />
            <span className="hidden md:inline">Insert Template</span>
          </button>

          <button
            onClick={handleValidate}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Validate Equipment Bindings and Pipes"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            <span className="hidden md:inline">Validate</span>
          </button>

          <button
            onClick={() => onLaunchRuntime && onLaunchRuntime(screenId)}
            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-emerald-800"
            title="Open Live SCADA Runtime View"
          >
            <Play size={13} />
            <span className="hidden md:inline">Live Mode</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save size={13} />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-emerald-900/60"
            title="Publish Authoritative Immutable Version"
          >
            Publish
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN WORKSPACE: COLLAPSIBLE LEFT | SVG CANVAS | COLLAPSIBLE RIGHT      */}
      {/* ===================================================================== */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* ------------------------------------------------------------------- */}
        {/* LEFT PANEL: Equipment Library, Layers, DM Assets                    */}
        {/* ------------------------------------------------------------------- */}
        <div 
          className={`border-r border-slate-800 bg-slate-950 flex flex-col z-10 transition-all duration-200 ${
            leftCollapsed ? 'w-10' : 'w-72'
          }`}
        >
          {/* Header & Collapse Toggle */}
          <div className="h-9 border-b border-slate-800 bg-slate-900/60 px-2 flex items-center justify-between shrink-0">
            {!leftCollapsed ? (
              <div className="flex items-center gap-1">
                {[
                  { key: 'symbols', label: 'Equipment', icon: Box },
                  { key: 'layers', label: 'Layers', icon: Layers },
                  { key: 'assets', label: 'DM Tree', icon: Tag }
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = leftTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setLeftTab(t.key)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="w-full flex justify-center text-slate-500">
                <Box size={14} />
              </div>
            )}

            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={leftCollapsed ? 'Expand Panel' : 'Collapse Panel'}
            >
              {leftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Left Panel Body */}
          {!leftCollapsed && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3">
              {leftTab === 'symbols' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Category Selector */}
                  <div className="mb-2">
                    <select
                      value={symbolCategory}
                      onChange={(e) => setSymbolCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {symbolCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search symbols..."
                      value={symbolSearch}
                      onChange={(e) => setSymbolSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Symbol Grid */}
                  <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 scrollbar-thin">
                    {filteredSymbols.map(sym => (
                      <div
                        key={sym.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/scada-symbol', JSON.stringify(sym));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => handleAddSymbol(sym)}
                        className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/60 rounded-lg p-2 flex flex-col items-center justify-between cursor-grab active:cursor-grabbing transition-all group select-none"
                        title={`Drag onto canvas or click to add: ${sym.description || sym.name}`}
                      >
                        <div 
                          className="w-12 h-12 flex items-center justify-center p-1 relative overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full group-hover:scale-105 transition-transform pointer-events-none"
                          dangerouslySetInnerHTML={{ __html: renderSymbolSvgPreview(sym) }}
                        />
                        <span className="text-[10px] font-medium text-slate-300 truncate w-full text-center mt-1 group-hover:text-cyan-300 pointer-events-none">
                          {sym.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leftTab === 'layers' && (
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                    Scene Elements ({screen.elements?.length || 0})
                  </div>
                  {(screen.elements || []).slice().reverse().map((el) => {
                    const isSelected = selectedElementIds.includes(el.instance_id);
                    return (
                      <div
                        key={el.instance_id}
                        onClick={(e) => handleElementMouseDown(e, el.instance_id)}
                        className={`px-2.5 py-1.5 rounded border text-xs flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950 border-cyan-500/60 text-cyan-200'
                            : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="truncate flex-1 font-mono text-[11px]">
                          {el.label || el.instance_id}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = screen.elements.map(item => item.instance_id === el.instance_id ? { ...item, is_hidden: !item.is_hidden } : item);
                              setScreen(prev => ({ ...prev, elements: next }));
                            }}
                            className="p-0.5 hover:text-slate-300"
                          >
                            {el.is_hidden ? <EyeOff size={11} className="text-amber-400" /> : <Eye size={11} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {leftTab === 'assets' && (
                <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col min-h-0">
                  <div className="p-2 mb-2 bg-slate-900/90 border border-slate-800 rounded text-[11px] text-slate-400 shrink-0">
                    {primarySelected ? (
                      <span>Click attribute or drag to canvas to map to <strong className="text-cyan-300">{primarySelected.label || primarySelected.instance_id}</strong></span>
                    ) : (
                      <span>Select equipment to bind, or drag attribute directly onto canvas to place new indicator.</span>
                    )}
                  </div>
                  <div className="flex-1 min-h-0">
                    <AssetAttributeBrowser
                      assets={assets}
                      compact={true}
                      onSelectAttribute={(attr) => {
                        if (primarySelected) {
                          handleBindAttributeSmart(primarySelected, attr);
                        } else {
                          const centerX = (-pan.x + 350) / zoom;
                          const centerY = (-pan.y + 250) / zoom;
                          handleCreateBadgeForAttribute(attr, centerX, centerY);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* CENTER: SCADA SVG CANVAS ENGINE (STABLE SCENE GRAPH)                */}
        {/* ------------------------------------------------------------------- */}
        <div 
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            // 1. Symbol dropped from library
            const symData = e.dataTransfer.getData('application/scada-symbol');
            if (symData) {
              try {
                const sym = JSON.parse(symData);
                const coords = getCanvasCoords(e);
                handleAddSymbolAt(sym, coords.x, coords.y);
                return;
              } catch (err) {
                console.error('Error dropping symbol:', err);
              }
            }
            // 2. Asset attribute dropped on canvas background
            const attrData = e.dataTransfer.getData('application/scada-attribute');
            if (attrData) {
              try {
                const attr = JSON.parse(attrData);
                const coords = getCanvasCoords(e);
                handleCreateBadgeForAttribute(attr, coords.x, coords.y);
              } catch (err) {
                console.error('Error dropping attribute on canvas:', err);
              }
            }
          }}
          className="flex-1 bg-[#020617] relative overflow-hidden cursor-crosshair"
          style={{
            backgroundImage: showGrid ? 'radial-gradient(#1e293b 1.5px, transparent 1.5px)' : 'none',
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Active Tool Notification Badge */}
          {activeTool === 'pipe' && (
            <div className="absolute top-3 left-4 z-20 bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>
                {connectingFrom 
                  ? 'Click target equipment connection port to complete pipe...' 
                  : 'Click source equipment connection port to begin pipe routing...'}
              </span>
              <button 
                onClick={() => { setActiveTool('select'); setConnectingFrom(null); }}
                className="ml-2 text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Canvas SVG Container */}
          <div
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: `${screen.width}px`,
              height: `${screen.height}px`
            }}
          >
            <svg
              id="scada-svg-canvas"
              width={screen.width}
              height={screen.height}
              viewBox={`0 0 ${screen.width} ${screen.height}`}
              className="absolute inset-0 shadow-2xl"
              style={{
                backgroundColor: screen.background?.color || '#020617',
                border: '1px solid #1e293b'
              }}
            >
              <defs>
                <style>{`
                  @keyframes pipeFlowDash {
                    from { stroke-dashoffset: 40; }
                    to { stroke-dashoffset: 0; }
                  }
                  .animated-pipe-flow {
                    animation: pipeFlowDash 1.2s linear infinite;
                  }
                `}</style>
              </defs>

              {/* Background Rect for Click-to-Deselect */}
              <rect
                id="canvas-bg-rect"
                x={0}
                y={0}
                width={screen.width}
                height={screen.height}
                fill="transparent"
              />

              {/* SMART PIPES CONNECTOR SCENE GRAPH */}
              {(screen.connections || []).map(conn => {
                const fromElem = screen.elements.find(e => e.instance_id === conn.from_id);
                const toElem = screen.elements.find(e => e.instance_id === conn.to_id);
                if (!fromElem || !toElem) return null;

                const p1 = getElementPortPos(fromElem, conn.from_port);
                const p2 = getElementPortPos(toElem, conn.to_port);
                const pathD = computeOrthogonalPath(p1, p2);
                const isSelected = selectedConnectionId === conn.id;

                return (
                  <g
                    key={conn.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConnectionId(conn.id);
                      setSelectedElementIds([]);
                      setRightTab('pipe');
                    }}
                  >
                    {/* Background casing pipe */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth={(conn.stroke_width || 3) + 4}
                      strokeLinecap="round"
                    />

                    {/* Pipe Flow Stream */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={conn.color || '#06b6d4'}
                      strokeWidth={conn.stroke_width || 3}
                      strokeLinecap="round"
                      strokeDasharray={conn.line_style === 'DASHED' || conn.animated ? '8 6' : 'none'}
                      className={conn.animated ? 'animated-pipe-flow' : ''}
                    />

                    {/* Selection Indicator */}
                    {isSelected && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={(conn.stroke_width || 3) + 6}
                        strokeDasharray="4 4"
                        opacity={0.7}
                      />
                    )}

                    {/* Midpoint Label Badge */}
                    {conn.label && (
                      <text
                        x={(p1.x + p2.x) / 2}
                        y={(p1.y + p2.y) / 2 - 8}
                        fill="#94a3b8"
                        fontSize={9}
                        fontWeight="600"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {conn.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* LIVE DRAWING PIPE PREVIEW */}
              {connectingFrom && (
                <path
                  d={computeOrthogonalPath(
                    { x: connectingFrom.x, y: connectingFrom.y },
                    mouseCanvasPos
                  )}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  className="pointer-events-none"
                />
              )}

              {/* EQUIPMENT ELEMENTS SCENE GRAPH */}
              {(screen.elements || []).map(elem => {
                if (elem.is_hidden) return null;
                const isSelected = selectedElementIds.includes(elem.instance_id);
                const sym = symbols.find(s => s.id === elem.symbol_id);
                if (!sym) return null;

                const scaleX = elem.flipH ? -1 : 1;
                const scaleY = elem.flipV ? -1 : 1;

                return (
                  <g
                    key={elem.instance_id}
                    transform={`translate(${elem.x}, ${elem.y}) rotate(${elem.rotation || 0} ${elem.width / 2} ${elem.height / 2}) scale(${scaleX}, ${scaleY})`}
                    className="cursor-move"
                    onMouseDown={(e) => handleElementMouseDown(e, elem.instance_id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDropOnElement(e, elem);
                    }}
                  >
                    {/* SVG Symbol content with native engineering dimensions and dynamic telemetry */}
                    <svg
                      x={0}
                      y={0}
                      width={elem.width}
                      height={elem.height}
                      viewBox={getSymbolNativeViewBox(sym, elem)}
                      preserveAspectRatio={getSymbolPreserveAspectRatio(sym, elem)}
                      overflow="visible"
                      dangerouslySetInnerHTML={{ __html: renderDynamicElementSvg(sym, elem, liveSnapshots, assets) }}
                    />

                    {/* Element Label Badge */}
                    {elem.label && (
                      <text
                        x={elem.width / 2}
                        y={elem.height + 14}
                        fill="#cbd5e1"
                        fontSize={10}
                        fontWeight="600"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {elem.label}
                      </text>
                    )}

                    {/* Selection Bounding Box */}
                    {isSelected && (
                      <g className="pointer-events-none">
                        <rect
                          x={-3}
                          y={-3}
                          width={elem.width + 6}
                          height={elem.height + 6}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth={1.5}
                          strokeDasharray="4,3"
                        />
                        <circle cx={-3} cy={-3} r={3.5} fill="#06b6d4" />
                        <circle cx={elem.width + 3} cy={-3} r={3.5} fill="#06b6d4" />
                        <circle cx={-3} cy={elem.height + 3} r={3.5} fill="#06b6d4" />
                        <circle cx={elem.width + 3} cy={elem.height + 3} r={3.5} fill="#06b6d4" />
                      </g>
                    )}

                    {/* Visible Snap Anchor Ports in Pipe Mode */}
                    {activeTool === 'pipe' && (
                      <g className="cursor-pointer">
                        {/* Suction / Left Port */}
                        <circle
                          cx={0}
                          cy={elem.height / 2}
                          r={5}
                          fill="#06b6d4"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          onClick={(e) => handlePortClick(e, elem, 'suction')}
                        />
                        {/* Discharge / Right Port */}
                        <circle
                          cx={elem.width}
                          cy={elem.height / 2}
                          r={5}
                          fill="#06b6d4"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          onClick={(e) => handlePortClick(e, elem, 'discharge')}
                        />
                        {/* Top Port */}
                        <circle
                          cx={elem.width / 2}
                          cy={0}
                          r={5}
                          fill="#06b6d4"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          onClick={(e) => handlePortClick(e, elem, 'top')}
                        />
                        {/* Bottom Port */}
                        <circle
                          cx={elem.width / 2}
                          cy={elem.height}
                          r={5}
                          fill="#06b6d4"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          onClick={(e) => handlePortClick(e, elem, 'bottom')}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Floating Action Feedback Toast */}
          {toastMessage && (
            <div className="absolute bottom-5 right-5 z-30 bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-3.5 py-2 rounded-lg text-xs shadow-2xl flex items-center gap-2 backdrop-blur animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* RIGHT PANEL: Properties, Asset Attribute Binding, Smart Pipe Props   */}
        {/* ------------------------------------------------------------------- */}
        <div 
          className={`border-l border-slate-800 bg-slate-950 flex flex-col z-10 transition-all duration-200 ${
            rightCollapsed ? 'w-10' : 'w-80'
          }`}
        >
          {/* Header & Collapse Toggle */}
          <div className="h-9 border-b border-slate-800 bg-slate-900/60 px-2 flex items-center justify-between shrink-0">
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={rightCollapsed ? 'Expand Panel' : 'Collapse Panel'}
            >
              {rightCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {!rightCollapsed ? (
              <div className="flex items-center gap-1">
                {[
                  { key: 'properties', label: 'Props', icon: Settings },
                  { key: 'binding', label: 'Binding', icon: Tag },
                  { key: 'pipe', label: 'Pipe', icon: GitBranch },
                  { key: 'behaviors', label: 'Behaviors', icon: Activity }
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = rightTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setRightTab(t.key)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="w-full flex justify-center text-slate-500">
                <Settings size={14} />
              </div>
            )}
          </div>

          {/* Right Panel Body */}
          {!rightCollapsed && (
            <div className="flex-1 overflow-y-auto p-3.5 scrollbar-thin">
              {/* ELEMENT PROPERTIES TAB */}
              {rightTab === 'properties' && (
                primarySelected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-white">{primarySelected.label}</div>
                        <div className="text-[10px] font-mono text-cyan-400">{primarySelected.instance_id}</div>
                      </div>
                      <button
                        onClick={handleDeleteSelected}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded"
                        title="Delete Element"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Display Label</label>
                      <input
                        type="text"
                        value={primarySelected.label || ''}
                        onChange={e => updatePrimaryElement('label', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Pos X (px)</label>
                        <input
                          type="number"
                          value={primarySelected.x}
                          onChange={e => updatePrimaryElement('x', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Pos Y (px)</label>
                        <input
                          type="number"
                          value={primarySelected.y}
                          onChange={e => updatePrimaryElement('y', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Width (px)</label>
                        <input
                          type="number"
                          value={primarySelected.width}
                          onChange={e => updatePrimaryElement('width', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Height (px)</label>
                        <input
                          type="number"
                          value={primarySelected.height}
                          onChange={e => updatePrimaryElement('height', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Rotation Angle</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="15"
                          value={primarySelected.rotation || 0}
                          onChange={e => updatePrimaryElement('rotation', Number(e.target.value))}
                          className="flex-1 accent-cyan-500"
                        />
                        <span className="text-xs font-mono text-cyan-400 w-10 text-right">
                          {primarySelected.rotation || 0}°
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-500 text-center gap-2">
                    <Box size={24} className="text-slate-700" />
                    <span>Select an equipment symbol on the canvas to configure properties.</span>
                  </div>
                )
              )}

              {/* ASSET ATTRIBUTE BINDING TAB */}
              {rightTab === 'binding' && (
                primarySelected ? (
                  <div className="space-y-4">
                    {/* Selected Element Header */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Box size={14} className="text-cyan-400" />
                          <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                            {primarySelected.label || primarySelected.instance_id}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {Object.keys(primarySelected.bindings || {}).length} Mapped
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                        Symbol: {primarySelected.symbol_id}
                      </div>
                    </div>

                    {/* Interactive Role-Based Attribute Binder */}
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-500/30 space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-cyan-400" />
                          <span className="text-xs font-bold text-white">Map Visual Role</span>
                        </div>
                        <span className="text-[10px] text-slate-400">ISA-95 Plant Asset</span>
                      </div>

                      {/* 1. Choose Visual Role */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Target Visual Role:
                        </label>
                        <select
                          value={bindingRole}
                          onChange={(e) => setBindingRole(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                        >
                          {getAvailableRolesForElement(
                            primarySelected,
                            symbols.find(s => s.id === primarySelected.symbol_id)
                          ).map(role => (
                            <option key={role.key} value={role.key}>
                              {role.label} {primarySelected.bindings?.[role.key] ? '✓' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Choose Asset */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Plant Asset:
                        </label>
                        <select
                          value={bindingAssetId || (assets[0]?.id || '')}
                          onChange={(e) => {
                            setBindingAssetId(e.target.value);
                            const ast = assets.find(a => a.id === e.target.value);
                            if (ast?.attributes?.length) {
                              setBindingAttrId(ast.attributes[0].id);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          {assets.map(ast => (
                            <option key={ast.id} value={ast.id}>
                              {ast.name} ({ast.level || 'EQUIPMENT'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Choose Attribute & Map Actions */}
                      {(() => {
                        const activeAst = assets.find(a => a.id === (bindingAssetId || assets[0]?.id)) || assets[0];
                        const attrs = activeAst?.attributes || [];
                        const selectedAttr = attrs.find(a => a.id === bindingAttrId) || attrs[0];

                        return (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Asset Attribute ({attrs.length} available):
                              </label>
                              <select
                                value={bindingAttrId || (attrs[0]?.id || '')}
                                onChange={(e) => setBindingAttrId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-emerald-300 focus:outline-none focus:border-cyan-500 font-mono"
                              >
                                {attrs.length === 0 ? (
                                  <option value="">No attributes on this asset</option>
                                ) : (
                                  attrs.map(attr => (
                                    <option key={attr.id} value={attr.id}>
                                      {attr.name} [{attr.tag_name || attr.name}] = {attr.value !== undefined ? attr.value : '--'} {attr.uom || ''}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-1 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={!selectedAttr}
                                onClick={() => handleBindRole(bindingRole, selectedAttr, activeAst)}
                                className="flex-1 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold text-xs rounded shadow flex items-center justify-center gap-1.5 transition"
                              >
                                <Check size={13} />
                                <span>Map Role</span>
                              </button>
                              <button
                                type="button"
                                disabled={!activeAst}
                                onClick={() => handleAutoMapRoles(primarySelected, activeAst)}
                                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-slate-700 flex items-center gap-1 transition"
                                title="Auto-map all matching attributes from this asset"
                              >
                                <Sparkles size={12} />
                                <span>Auto-All</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Active Bindings List */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>Active Bindings</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {Object.keys(primarySelected.bindings || {}).length} roles configured
                        </span>
                      </div>

                      {Object.keys(primarySelected.bindings || {}).length === 0 ? (
                        <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">No Active Bindings</span>
                            <span>Use the binder above or drag an attribute from the left DM tree to map live process values.</span>
                          </div>
                        </div>
                      ) : (
                        Object.entries(primarySelected.bindings).map(([key, bDef]) => (
                          <div key={key} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs group hover:border-slate-700">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-cyan-400 font-mono text-[11px]">{key}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] uppercase font-mono px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                                  {bDef.mode || 'DYNAMIC'}
                                </span>
                                <button
                                  onClick={() => handleUnbindRole(key)}
                                  className="p-0.5 text-slate-500 hover:text-rose-400 rounded transition"
                                  title={`Unbind ${key}`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between">
                              <span>Tag: <span className="text-emerald-400">{bDef.tag_name || 'N/A'}</span></span>
                              {bDef.value !== undefined && (
                                <span className="text-sky-300 font-bold">{bDef.value} {bDef.uom || ''}</span>
                              )}
                            </div>
                            {bDef.asset_name && (
                              <div className="text-[10px] text-slate-500 truncate">
                                Asset: {bDef.asset_name} {bDef.attribute_name ? `> ${bDef.attribute_name}` : ''}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Manual Override (Testing & Simulation) */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Manual Tag & Value Override</span>
                        <span className="text-[9px] text-slate-500">Live Preview</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Tag Name</label>
                          <input
                            type="text"
                            placeholder="e.g. PT-101.PV"
                            value={manualTag}
                            onChange={(e) => setManualTag(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Value</label>
                          <input
                            type="text"
                            placeholder="e.g. 4.8"
                            value={manualVal}
                            onChange={(e) => setManualVal(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Unit (e.g. bar)"
                          value={manualUom}
                          onChange={(e) => setManualUom(e.target.value)}
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => {
                            if (!manualTag && !manualVal) return;
                            const currentBindings = { ...(primarySelected.bindings || {}) };
                            if (manualTag) {
                              currentBindings.tag_name = { mode: 'MANUAL', tag_name: manualTag };
                            }
                            if (manualVal) {
                              currentBindings.pv_value = {
                                mode: 'MANUAL',
                                tag_name: manualTag || 'MANUAL.PV',
                                value: manualVal,
                                uom: manualUom || ''
                              };
                            }
                            if (manualUom) {
                              currentBindings.uom = { mode: 'MANUAL', uom: manualUom };
                            }
                            updatePrimaryElement('bindings', currentBindings);
                            recordHistory(screen.elements, screen.connections);
                            showToast('Applied manual override');
                          }}
                          className="w-1/2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-slate-700 transition font-medium"
                        >
                          Apply Values
                        </button>
                      </div>
                    </div>

                    {/* Button to Open DM Asset Tree in Left Panel */}
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => { setLeftCollapsed(false); setLeftTab('assets'); }}
                        className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FolderTree size={13} />
                        <span>Browse Full DM Asset Tree in Left Panel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-500 text-center gap-2">
                    <Tag size={24} className="text-slate-700" />
                    <span>Select an equipment symbol on the canvas to configure Asset Attribute bindings.</span>
                  </div>
                )
              )}

              {/* SMART PIPE PROPERTIES TAB */}
              {rightTab === 'pipe' && (
                selectedConnection ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-white">{selectedConnection.label || 'Process Pipe'}</div>
                        <div className="text-[10px] font-mono text-cyan-400">{selectedConnection.id}</div>
                      </div>
                      <button
                        onClick={handleDeleteSelected}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded"
                        title="Delete Pipe"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Pipe Label</label>
                      <input
                        type="text"
                        value={selectedConnection.label || ''}
                        onChange={e => updateSelectedConnection('label', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Stroke Width (px)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedConnection.stroke_width || 3}
                        onChange={e => updateSelectedConnection('stroke_width', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedConnection.color || '#06b6d4'}
                          onChange={e => updateSelectedConnection('color', e.target.value)}
                          className="w-8 h-8 rounded bg-transparent cursor-pointer"
                        />
                        <span className="font-mono text-xs text-slate-300">{selectedConnection.color || '#06b6d4'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-slate-300">Animated Flow</span>
                      <button
                        onClick={() => updateSelectedConnection('animated', !selectedConnection.animated)}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                          selectedConnection.animated ? 'bg-cyan-600 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-500 text-center gap-2">
                    <GitBranch size={24} className="text-slate-700" />
                    <span>Select a pipe connection on the canvas to configure line styling and animation.</span>
                  </div>
                )
              )}

              {/* BEHAVIORS TAB */}
              {rightTab === 'behaviors' && (
                primarySelected ? (
                  <div className="space-y-3 text-xs">
                    <div className="text-slate-400 text-[11px]">
                      Configured visual state animations for this symbol:
                    </div>
                    {symbols.find(s => s.id === primarySelected.symbol_id)?.behaviors?.map((b, i) => (
                      <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                        <div className="font-semibold text-cyan-400 capitalize">{b.type} Animation</div>
                        <div className="text-[10px] text-slate-400">Target element: <code>{b.target}</code></div>
                        <div className="text-[10px] text-slate-500">Trigger on: {b.trigger}</div>
                      </div>
                    )) || <div className="text-slate-500 italic">No behaviors configured</div>}
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-500 text-center gap-2">
                    <Activity size={24} className="text-slate-700" />
                    <span>Select an equipment symbol to inspect behaviors.</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM DIAGNOSTICS & LIVE TAG INSPECTOR                               */}
      {/* ===================================================================== */}
      <div className={`border-t border-slate-800 bg-slate-950 transition-all shrink-0 ${isBottomOpen ? 'h-36' : 'h-7'}`}>
        <div className="h-7 border-b border-slate-800 px-3 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            {[
              { key: 'inspector', label: 'Live Tag Values', icon: Radio },
              { key: 'validation', label: 'Binding Validation', icon: ShieldCheck },
              { key: 'stats', label: 'Scene Stats', icon: Activity }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setBottomTab(tab.key); setIsBottomOpen(true); }}
                  className={`text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                    bottomTab === tab.key && isBottomOpen
                      ? 'text-cyan-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsBottomOpen(!isBottomOpen)}
            className="text-slate-500 hover:text-slate-300 p-0.5"
          >
            {isBottomOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>

        {isBottomOpen && (
          <div className="p-3 h-28 overflow-y-auto font-mono text-[11px] scrollbar-thin">
            {bottomTab === 'inspector' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.keys(liveSnapshots).length === 0 ? (
                  <span className="text-slate-500">No live telemetry tags currently mapped to elements.</span>
                ) : (
                  Object.entries(liveSnapshots).map(([tag, snap]) => (
                    <div key={tag} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">{tag}</div>
                        <div className="text-xs text-cyan-400 font-bold">{snap.value ?? 'N/A'} {snap.eng_units}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        snap.quality === 'GOOD' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {snap.quality}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {bottomTab === 'validation' && (
              <div>
                {validationResult ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 size={13} />
                      <span>Checked {validationResult.checked_elements} elements &amp; {screen.connections?.length || 0} pipes</span>
                    </div>
                    {validationResult.warnings?.map((w, i) => (
                      <div key={i} className="text-amber-400 text-[10px]">{w}</div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">Click "Validate" on the toolbar to execute comprehensive binding and connection checks.</span>
                )}
              </div>
            )}

            {bottomTab === 'stats' && (
              <div className="text-slate-400 text-[11px] space-y-1">
                <div>Active Equipment Elements: {screen.elements?.length || 0}</div>
                <div>Smart Pipe Connections: {screen.connections?.length || 0}</div>
                <div>Canvas Resolution: {screen.width} × {screen.height} px</div>
                <div>Zoom: {Math.round(zoom * 100)}% | Pan: ({Math.round(pan.x)}, {Math.round(pan.y)})</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* QUICK TEMPLATE INSERT MODAL                                           */}
      {/* ===================================================================== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Insert Process Skid / Assembly Template
                </h3>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleInsertTemplate(tpl)}
                  className="bg-slate-950 border border-slate-800 hover:border-cyan-500 rounded-lg p-3 cursor-pointer transition-colors group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                        {tpl.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {tpl.elements?.length || 0} Eq
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">
                      {tpl.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 flex justify-end">
                    <span className="text-[10px] font-semibold text-cyan-400 group-hover:underline">
                      Insert Skid →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
