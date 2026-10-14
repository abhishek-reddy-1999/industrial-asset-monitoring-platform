import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Sliders, Play, Square, AlertTriangle, CheckCircle2, 
  RefreshCw, Radio, Server, Wifi, Cpu, Settings, Eye, ZoomIn, 
  ZoomOut, Maximize2, Shield, X, ArrowUpRight, Flame, Droplets,
  Layers, ChevronRight, Gauge, Lock, Unlock, Zap, Plus, Trash2, 
  Edit3, Move, MousePointer, Search, Database, Check, Tag,
  FolderPlus, Copy, Download, SlidersHorizontal, BarChart3, Wind,
  ChevronDown, ArrowRight, CornerDownRight, RotateCw, Power,
  ChevronUp, Grid, ShieldAlert, Thermometer, Disc, Volume2,
  ArrowUp, ArrowDown, ArrowLeft, Crosshair, Sparkles
} from 'lucide-react';
import { telemetryWS } from '../api/websocket';
import { useDM } from '../views/dm/dmContext';

// ============================================================================
// 1. FUXA UI ELEMENT TOOLBOX CATALOG (35+ Authentic Industrial Components)
// ============================================================================
export const FUXA_TOOLBOX_ITEMS = [
  // --- Vessels & Separators ---
  { type: 'StorageTank', category: 'Vessels', name: 'API Storage Tank', defaultW: 80, defaultH: 110, defaultTag: 'FIC_101.PV', defaultProp: 'fill_level' },
  { type: 'ProcessColumn', category: 'Vessels', name: 'Fractionation Column', defaultW: 130, defaultH: 370, defaultTag: 'LIC_101.PV', defaultProp: 'fill_level' },
  { type: 'HorizontalDrum', category: 'Vessels', name: 'Reflux Drum', defaultW: 80, defaultH: 44, defaultTag: 'FIC_102.PV', defaultProp: 'fill_level' },
  { type: 'CSTRReactor', category: 'Vessels', name: 'CSTR Reactor (Agitated)', defaultW: 90, defaultH: 125, defaultTag: 'TIC_102.PV', defaultProp: 'temperature' },
  { type: 'SphericalTank', category: 'Vessels', name: 'Pressurized LPG Sphere', defaultW: 85, defaultH: 95, defaultTag: 'PIC_101.PV', defaultProp: 'fill_level' },
  { type: 'HopperSilo', category: 'Vessels', name: 'Bulk Solids Silo / Hopper', defaultW: 75, defaultH: 120, defaultTag: 'LIC_101.PV', defaultProp: 'fill_level' },
  { type: 'Decanter', category: 'Vessels', name: 'Decanter / Separator', defaultW: 90, defaultH: 48, defaultTag: 'FIC_102.PV', defaultProp: 'fill_level' },
  { type: 'FlashDrum', category: 'Vessels', name: 'Flash Vapor Drum', defaultW: 65, defaultH: 95, defaultTag: 'PIC_101.PV', defaultProp: 'fill_level' },

  // --- Machinery & Rotating Equipment ---
  { type: 'CentrifugalPump', category: 'Machinery', name: 'Centrifugal Pump (ANSI)', defaultW: 54, defaultH: 54, defaultTag: 'PUMP_101A.DIFF_HEAD', defaultProp: 'running' },
  { type: 'PositiveDispPump', category: 'Machinery', name: 'Positive Displ. Pump', defaultW: 56, defaultH: 44, defaultTag: 'FIC_101.PV', defaultProp: 'running' },
  { type: 'AirBlower', category: 'Machinery', name: 'Forced Draft Fan', defaultW: 56, defaultH: 56, defaultTag: 'VIB_101.RMS', defaultProp: 'running' },
  { type: 'Compressor', category: 'Machinery', name: 'Gas Compressor', defaultW: 72, defaultH: 48, defaultTag: 'PIC_101.PV', defaultProp: 'running' },
  { type: 'AgitatorMotor', category: 'Machinery', name: 'Top Drive Agitator', defaultW: 52, defaultH: 56, defaultTag: 'VIB_101.RMS', defaultProp: 'running' },

  // --- Valves & Actuators ---
  { type: 'ControlValve', category: 'Valves', name: 'Diaphragm Control Valve', defaultW: 34, defaultH: 34, defaultTag: 'FIC_101.PV', defaultProp: 'opening_pct' },
  { type: 'GateValve', category: 'Valves', name: 'Manual Gate Valve', defaultW: 28, defaultH: 28, defaultTag: 'LIC_101.PV', defaultProp: 'opening_pct' },
  { type: 'BallValve', category: 'Valves', name: 'Quarter-Turn Ball Valve', defaultW: 28, defaultH: 26, defaultTag: 'FIC_102.PV', defaultProp: 'opening_pct' },
  { type: 'ThreeWayValve', category: 'Valves', name: '3-Way Diverter Valve', defaultW: 34, defaultH: 34, defaultTag: 'FIC_101.PV', defaultProp: 'opening_pct' },
  { type: 'SafetyValve', category: 'Valves', name: 'Safety Relief Valve (PSV)', defaultW: 30, defaultH: 34, defaultTag: 'PIC_101.PV', defaultProp: 'value' },
  { type: 'ESDValve', category: 'Valves', name: 'Emergency Shutdown (ESD)', defaultW: 34, defaultH: 36, defaultTag: 'FIC_101.PV', defaultProp: 'running' },
  { type: 'CheckValve', category: 'Valves', name: 'Non-Return Check Valve', defaultW: 26, defaultH: 22, defaultTag: 'FIC_101.PV', defaultProp: 'value' },
  { type: 'MotorizedValve', category: 'Valves', name: 'Motorized Valve (MOV)', defaultW: 36, defaultH: 38, defaultTag: 'FIC_102.PV', defaultProp: 'opening_pct' },

  // --- Heat Transfer Equipment ---
  { type: 'HeatExchanger', category: 'Heat Transfer', name: 'Shell & Tube Exchanger', defaultW: 74, defaultH: 46, defaultTag: 'TIC_101.PV', defaultProp: 'value' },
  { type: 'Reboiler', category: 'Heat Transfer', name: 'Thermosiphon Reboiler', defaultW: 64, defaultH: 38, defaultTag: 'TIC_102.PV', defaultProp: 'value' },
  { type: 'AirCooler', category: 'Heat Transfer', name: 'Fin-Fan Air Cooler', defaultW: 76, defaultH: 36, defaultTag: 'TIC_101.PV', defaultProp: 'value' },
  { type: 'FiredHeater', category: 'Heat Transfer', name: 'Process Furnace / Heater', defaultW: 86, defaultH: 120, defaultTag: 'TIC_102.PV', defaultProp: 'value' },
  { type: 'PlateExchanger', category: 'Heat Transfer', name: 'Plate & Frame Exchanger', defaultW: 55, defaultH: 48, defaultTag: 'TIC_101.PV', defaultProp: 'value' },

  // --- Process Piping & Conduits ---
  { type: 'PipeHorizontal', category: 'Piping', name: 'Pipe (Horizontal 160px)', defaultW: 160, defaultH: 12, defaultTag: 'FIC_101.PV', defaultProp: 'running' },
  { type: 'PipeVertical', category: 'Piping', name: 'Pipe (Vertical 160px)', defaultW: 12, defaultH: 160, defaultTag: 'FIC_101.PV', defaultProp: 'running' },
  { type: 'PipeElbow', category: 'Piping', name: 'Pipe Elbow (90° Corner)', defaultW: 50, defaultH: 50, defaultTag: 'FIC_101.PV', defaultProp: 'running' },

  // --- Instrumentation & Indicators ---
  { type: 'DigitalBadge', category: 'Meters & HMI', name: 'Digital Process Badge', defaultW: 104, defaultH: 52, defaultTag: 'FIC_101.PV', defaultProp: 'value' },
  { type: 'RadialGauge', category: 'Meters & HMI', name: 'Radial Bourdon Gauge', defaultW: 84, defaultH: 84, defaultTag: 'PIC_101.PV', defaultProp: 'value' },
  { type: 'LevelBarMeter', category: 'Meters & HMI', name: 'Vertical Bar Indicator', defaultW: 36, defaultH: 110, defaultTag: 'LIC_101.PV', defaultProp: 'fill_level' },
  { type: 'ToggleSwitch', category: 'Meters & HMI', name: 'Industrial Selector Switch', defaultW: 44, defaultH: 50, defaultTag: 'PUMP_101A.DIFF_HEAD', defaultProp: 'running' },
  { type: 'PushButton', category: 'Meters & HMI', name: 'Momentary Pushbutton', defaultW: 42, defaultH: 42, defaultTag: 'FIC_101.PV', defaultProp: 'running' },
  { type: 'EmergencyStop', category: 'Meters & HMI', name: 'Emergency E-Stop Button', defaultW: 46, defaultH: 46, defaultTag: 'PIC_101.PV', defaultProp: 'running' },

  // --- Logic & Function Blocks ---
  { type: 'FunctionBlockWidget', category: 'Logic & FB', name: 'V8 Function Block Card', defaultW: 120, defaultH: 48, defaultTag: 'CDU_101.DELTA_T', defaultProp: 'value' }
];

export default function FuxaScadaWidget({
  compact = false,
  assetFilter = null,
  onOpenFunctionBlock = null
}) {
  const {
    scadaWindows = [],
    createScadaWindow,
    updateScadaWindow,
    deleteScadaWindow,
    addScadaElement,
    updateScadaElement,
    deleteScadaElement,
    fetchMappableDmTags,
    mappableDmTags = [],
    assets = [],
    showToast
  } = useDM();

  // Active SCADA Window state
  const [activeWindowId, setActiveWindowId] = useState(scadaWindows[0]?.id || '');
  const [mode, setMode] = useState('engineering'); // 'engineering' (FUXA Editor) | 'runtime' (Live Plant View) | 'protocols'
  const [flowSpeed, setFlowSpeed] = useState('normal'); // 'fast' | 'normal' | 'slow' | 'paused'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeAlarmsCount, setActiveAlarmsCount] = useState(0);

  // Editor Dragging & Selection State
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [nudgeStep, setNudgeStep] = useState(10); // 1 | 5 | 10 | 50
  const [isToolboxOpen, setIsToolboxOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isCreateWindowModalOpen, setIsCreateWindowModalOpen] = useState(false);
  const [isTagMappingModalOpen, setIsTagMappingModalOpen] = useState(false);
  const [selectedTagForFaceplate, setSelectedTagForFaceplate] = useState(null);

  // Component Palette Search & Filter
  const [paletteSearch, setPaletteSearch] = useState('');
  const [paletteCategory, setPaletteCategory] = useState('ALL');

  // Inspector Active Tab
  const [inspectorTab, setInspectorTab] = useState('attributes'); // 'attributes' | 'binding' | 'simulation'

  // Debounced Save Reference
  const saveTimeoutRef = useRef(null);

  // Local window elements cache for 60fps silky dragging & editing
  const [localElements, setLocalElements] = useState([]);
  const svgRef = useRef(null);

  // Local lines cache for editable piping and flow conduits
  const [localLines, setLocalLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState(null);

  const selectedLine = localLines.find(l => l.id === selectedLineId) || null;

  const handleAddLine = () => {
    const id = `pipe-${Date.now().toString().slice(-4)}`;
    const newLine = {
      id,
      name: `Pipe Line ${localLines.length + 1}`,
      path: 'M 160 220 L 360 220 L 360 300',
      color: '#f59e0b',
      width: 5,
      flowType: 'hydrocarbon',
      animated: true,
      tag: ''
    };
    setLocalLines(prev => [...prev, newLine]);
    setSelectedLineId(id);
    setSelectedElementId(null);
    setIsInspectorOpen(true);
    showToast?.(`Added new editable pipe line (${id})`, 'info');
  };

  const handleUpdateLine = (lineId, updates) => {
    setLocalLines(prev => prev.map(l => l.id === lineId ? { ...l, ...updates } : l));
  };

  const handleDeleteLine = (lineId) => {
    setLocalLines(prev => prev.filter(l => l.id !== lineId));
    if (selectedLineId === lineId) setSelectedLineId(null);
    showToast?.('Pipe line removed', 'info');
  };

  // New Window Form State
  const [newWindowForm, setNewWindowForm] = useState({
    title: '',
    description: '',
    asset_id: assets[0]?.id || '',
    width: 1060,
    height: 580,
    background_color: '#020617',
    grid_size: 20
  });

  // Tag Mapping Dialog State
  const [mappingElement, setMappingElement] = useState(null);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagSourceFilter, setTagSourceFilter] = useState('ALL');
  const [simulatedTestValue, setSimulatedTestValue] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);

  // Live Plant Process Values (defaults will update via WebSocket or fallback polling)
  const [telemetry, setTelemetry] = useState({});

  // Equipment Runtime State
  const [pumpRunning, setPumpRunning] = useState(false);
  const [valvesState, setValvesState] = useState({});

  // Faceplate Form state for PID loop tuning
  const [faceplateForm, setFaceplateForm] = useState({
    tag: '',
    mode: 'AUT',
    sp: 0,
    mv: 0
  });

  // Fetch mappable tags on mount
  useEffect(() => {
    fetchMappableDmTags().then(tags => {
      if (tags && tags.length > 0) setAvailableTags(tags);
    });
  }, []);

  // Sync available tags with context
  useEffect(() => {
    if (mappableDmTags && mappableDmTags.length > 0) {
      setAvailableTags(mappableDmTags);
    }
  }, [mappableDmTags]);

  // Current active window object
  const activeWindow = scadaWindows.find(w => w.id === activeWindowId) || scadaWindows[0] || null;

  // Sync activeWindow elements to localElements ONLY when window ID changes or initial load
  const loadedWindowIdRef = useRef(null);
  useEffect(() => {
    if (activeWindow) {
      if (activeWindow.id !== loadedWindowIdRef.current || localElements.length === 0) {
        setLocalElements(activeWindow.elements || []);
        loadedWindowIdRef.current = activeWindow.id;
      }
    }
  }, [activeWindow?.id]);

  // Auto-select first window if none selected
  useEffect(() => {
    if (!activeWindowId && scadaWindows.length > 0) {
      setActiveWindowId(scadaWindows[0].id);
    }
  }, [scadaWindows, activeWindowId]);

  // Selected Element reference
  const selectedElement = localElements.find(e => e.id === selectedElementId) || null;

  // WebSocket Live Telemetry Stream
  useEffect(() => {
    telemetryWS.connect();
    const unsubscribe = telemetryWS.subscribe((tags) => {
      setTelemetry((prev) => {
        const next = { ...prev };
        let alarmCount = 0;
        Object.entries(tags).forEach(([tagName, tagObj]) => {
          const val = typeof tagObj === 'object' ? tagObj.value : tagObj;
          if (next[tagName]) {
            next[tagName] = {
              ...next[tagName],
              value: Number(val) || next[tagName].value
            };
          } else {
            next[tagName] = {
              value: Number(val) || 0,
              units: tagObj.eng_units || '',
              name: tagObj.display_name || tagName,
              sp: Number(val) || 0,
              mv: 50
            };
          }
          const cur = next[tagName];
          if (cur && cur.hh && cur.value >= cur.hh) alarmCount++;
          else if (cur && cur.ll && cur.value <= cur.ll) alarmCount++;
        });
        setActiveAlarmsCount(alarmCount);
        return next;
      });
    });

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/tags/list');
        if (res.ok) {
          const tagList = await res.json();
          setTelemetry((prev) => {
            const next = { ...prev };
            tagList.forEach((t) => {
              if (t.tag_name && t.latest_value !== null && t.latest_value !== undefined) {
                if (next[t.tag_name]) {
                  next[t.tag_name].value = Number(t.latest_value);
                }
              }
            });
            return next;
          });
        }
      } catch (e) {
        // ignore
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Update Faceplate Form when selected tag changes
  useEffect(() => {
    if (selectedTagForFaceplate && telemetry[selectedTagForFaceplate]) {
      const t = telemetry[selectedTagForFaceplate];
      setFaceplateForm({
        tag: selectedTagForFaceplate,
        mode: 'AUT',
        sp: t.sp || t.value,
        mv: t.mv || 50
      });
    }
  }, [selectedTagForFaceplate]);

  // Convert client mouse event to SVG coordinate space
  const getSvgCoordinates = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  // ==========================================================================
  // BULLETPROOF POINTER DRAGGING SYSTEM (Direct Window Listener & Scale Safe)
  // ==========================================================================
  const handleElementPointerDown = (e, el) => {
    if (mode !== 'engineering') {
      // Runtime click handling
      handleRuntimeClick(el);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsInspectorOpen(true);

    const elemStartX = Number(el.x) || 0;
    const elemStartY = Number(el.y) || 0;
    const mouseStartX = e.clientX;
    const mouseStartY = e.clientY;
    const currentScale = zoomLevel || 1;
    let didMove = false;

    const onPointerMove = (evt) => {
      evt.preventDefault();
      const dx = (evt.clientX - mouseStartX) / currentScale;
      const dy = (evt.clientY - mouseStartY) / currentScale;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        didMove = true;
      }

      let newX = elemStartX + dx;
      let newY = elemStartY + dy;

      if (snapToGrid) {
        const g = activeWindow?.grid_size || 20;
        newX = Math.round(newX / g) * g;
        newY = Math.round(newY / g) * g;
      }

      // Constrain inside canvas
      newX = Math.max(0, Math.min(1040, Math.round(newX)));
      newY = Math.max(0, Math.min(560, Math.round(newY)));

      // Update in local state for 60fps immediate response
      setLocalElements(prev => prev.map(item => item.id === el.id ? { ...item, x: newX, y: newY } : item));
    };

    const onPointerUp = (evt) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (didMove && activeWindow) {
        const dx = (evt.clientX - mouseStartX) / currentScale;
        const dy = (evt.clientY - mouseStartY) / currentScale;
        let finalX = elemStartX + dx;
        let finalY = elemStartY + dy;

        if (snapToGrid) {
          const g = activeWindow?.grid_size || 20;
          finalX = Math.round(finalX / g) * g;
          finalY = Math.round(finalY / g) * g;
        }

        finalX = Math.max(0, Math.min(1040, Math.round(finalX)));
        finalY = Math.max(0, Math.min(560, Math.round(finalY)));

        // Persist to backend without noisy toast
        updateScadaElement(activeWindow.id, el.id, { x: finalX, y: finalY });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Runtime click interactions
  const handleRuntimeClick = (el) => {
    if (el.type === 'CentrifugalPump' || el.type === 'PositiveDispPump') {
      setPumpRunning(prev => !prev);
      showToast?.(`Toggled ${el.label}: ${!pumpRunning ? 'RUNNING' : 'STOPPED'}`, 'info');
    } else if (el.type === 'ControlValve' || el.type === 'GateValve' || el.type === 'BallValve') {
      setValvesState(prev => {
        const cur = prev[el.label] || { open_pct: 50 };
        const nextVal = cur.open_pct > 20 ? 0 : 75;
        showToast?.(`${el.label} position: ${nextVal}%`, 'info');
        return { ...prev, [el.label]: { open_pct: nextVal } };
      });
    } else if (el.type === 'ToggleSwitch' || el.type === 'PushButton') {
      showToast?.(`Triggered action on ${el.label}`, 'success');
    } else if (el.mapped_tag) {
      setSelectedTagForFaceplate(el.mapped_tag);
    }
  };

  // Keyboard Navigation: Arrow keys to nudge, Delete to remove, Ctrl+D to duplicate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'engineering' || !selectedElementId) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const step = e.shiftKey ? 20 : 5;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setLocalElements(prev => prev.map(el => {
          if (el.id !== selectedElementId) return el;
          let nx = Number(el.x) || 0;
          let ny = Number(el.y) || 0;
          if (e.key === 'ArrowUp') ny = Math.max(0, ny - step);
          if (e.key === 'ArrowDown') ny = Math.min(560, ny + step);
          if (e.key === 'ArrowLeft') nx = Math.max(0, nx - step);
          if (e.key === 'ArrowRight') nx = Math.min(1040, nx + step);
          updateScadaElement(activeWindow.id, el.id, { x: nx, y: ny });
          return { ...el, x: nx, y: ny };
        }));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteScadaElement(activeWindow.id, selectedElementId);
        setSelectedElementId(null);
        showToast?.('Element removed from canvas', 'info');
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedElementId, activeWindow]);

  // Drag and Drop from Palette onto Canvas
  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    if (mode !== 'engineering' || !activeWindow) return;
    try {
      const dataStr = e.dataTransfer.getData('application/fuxa-element');
      if (!dataStr) return;
      const item = JSON.parse(dataStr);
      const svgP = getSvgCoordinates(e);

      let placeX = Math.round(svgP.x - item.defaultW / 2);
      let placeY = Math.round(svgP.y - item.defaultH / 2);

      if (snapToGrid) {
        const g = activeWindow.grid_size || 20;
        placeX = Math.round(placeX / g) * g;
        placeY = Math.round(placeY / g) * g;
      }

      placeX = Math.max(10, Math.min(1020, placeX));
      placeY = Math.max(10, Math.min(540, placeY));

      const prefixMap = {
        'CentrifugalPump': 'P',
        'PositiveDispPump': 'P',
        'AirBlower': 'FD',
        'Compressor': 'K',
        'AgitatorMotor': 'AG',
        'StorageTank': 'TK',
        'ProcessColumn': 'C',
        'HorizontalDrum': 'D',
        'CSTRReactor': 'R',
        'SphericalTank': 'V',
        'HopperSilo': 'S',
        'Decanter': 'SP',
        'FlashDrum': 'D',
        'ControlValve': 'FCV',
        'GateValve': 'MOV',
        'BallValve': 'XV',
        'ThreeWayValve': 'TV',
        'SafetyValve': 'PSV',
        'ESDValve': 'ESD',
        'CheckValve': 'NRV',
        'MotorizedValve': 'MOV',
        'HeatExchanger': 'E',
        'Reboiler': 'E',
        'AirCooler': 'AC',
        'FiredHeater': 'H',
        'PlateExchanger': 'E',
        'DigitalBadge': 'FI',
        'RadialGauge': 'PI',
        'LevelBarMeter': 'LI',
        'ToggleSwitch': 'HS',
        'PushButton': 'PB',
        'EmergencyStop': 'ESD',
        'FunctionBlockWidget': 'FB'
      };
      const pfx = prefixMap[item.type] || item.type.substring(0, 3).toUpperCase();
      const num = Math.floor(Math.random() * 89 + 101);
      const generatedLabel = `${pfx}-${num}`;

      const newElem = {
        type: item.type,
        label: generatedLabel,
        x: placeX,
        y: placeY,
        width: item.defaultW,
        height: item.defaultH,
        mapped_tag: item.defaultTag,
        source_type: 'CENTUM_VP',
        bound_property: item.defaultProp,
        units: item.type === 'StorageTank' || item.type === 'ProcessColumn' ? '%' : '°C'
      };

      // Add to local state immediately
      setLocalElements(prev => [...prev, { ...newElem, id: 'temp-' + Date.now() }]);

      addScadaElement(activeWindow.id, newElem).then((created) => {
        if (created) {
          setSelectedElementId(created.id);
          setLocalElements(prev => prev.map(el => el.id.startsWith('temp-') ? created : el));
        }
      });
      showToast?.(`Placed ${item.name} (${generatedLabel}) at (${placeX}, ${placeY})`, 'success');
    } catch (err) {
      console.error('Error dropping element:', err);
    }
  };

  // Add Element from Toolbox via single click
  const handleAddToolboxElement = async (item) => {
    if (!activeWindow) return;
    const placeX = 200 + Math.floor(Math.random() * 200);
    const placeY = 150 + Math.floor(Math.random() * 120);

    const prefixMap = {
      'CentrifugalPump': 'P',
      'PositiveDispPump': 'P',
      'AirBlower': 'FD',
      'Compressor': 'K',
      'AgitatorMotor': 'AG',
      'StorageTank': 'TK',
      'ProcessColumn': 'C',
      'HorizontalDrum': 'D',
      'CSTRReactor': 'R',
      'SphericalTank': 'V',
      'HopperSilo': 'S',
      'Decanter': 'SP',
      'FlashDrum': 'D',
      'ControlValve': 'FCV',
      'GateValve': 'MOV',
      'BallValve': 'XV',
      'ThreeWayValve': 'TV',
      'SafetyValve': 'PSV',
      'ESDValve': 'ESD',
      'CheckValve': 'NRV',
      'MotorizedValve': 'MOV',
      'HeatExchanger': 'E',
      'Reboiler': 'E',
      'AirCooler': 'AC',
      'FiredHeater': 'H',
      'PlateExchanger': 'E',
      'DigitalBadge': 'FI',
      'RadialGauge': 'PI',
      'LevelBarMeter': 'LI',
      'ToggleSwitch': 'HS',
      'PushButton': 'PB',
      'EmergencyStop': 'ESD',
      'FunctionBlockWidget': 'FB'
    };
    const pfx = prefixMap[item.type] || item.type.substring(0, 3).toUpperCase();
    const num = Math.floor(Math.random() * 89 + 101);
    const generatedLabel = `${pfx}-${num}`;

    const newElem = {
      type: item.type,
      label: generatedLabel,
      x: placeX,
      y: placeY,
      width: item.defaultW,
      height: item.defaultH,
      mapped_tag: item.defaultTag,
      source_type: 'CENTUM_VP',
      bound_property: item.defaultProp,
      units: item.type === 'StorageTank' || item.type === 'ProcessColumn' ? '%' : '°C'
    };

    // Add to local state immediately
    const tempId = 'temp-' + Date.now();
    setLocalElements(prev => [...prev, { ...newElem, id: tempId }]);
    setSelectedElementId(tempId);

    const created = await addScadaElement(activeWindow.id, newElem);
    if (created) {
      setSelectedElementId(created.id);
      setLocalElements(prev => prev.map(el => el.id === tempId ? created : el));
    }
    showToast?.(`Placed ${item.name} onto canvas`, 'success');
  };

  // Duplicate Selected Element
  const handleDuplicateElement = async () => {
    if (!selectedElement || !activeWindow) return;
    const duplicated = {
      ...selectedElement,
      id: undefined,
      label: `${selectedElement.label}_Copy`,
      x: Math.min(1000, (Number(selectedElement.x) || 0) + 30),
      y: Math.min(540, (Number(selectedElement.y) || 0) + 30)
    };
    const created = await addScadaElement(activeWindow.id, duplicated);
    if (created) {
      setLocalElements(prev => [...prev, created]);
      setSelectedElementId(created.id);
    }
    showToast?.(`Duplicated ${selectedElement.label}`, 'success');
  };

  // Quick Inspector Property Change with immediate 60fps local update & debounced persist
  const handleInspectorChange = (field, value) => {
    if (!selectedElement || !activeWindow) return;
    const updated = { ...selectedElement, [field]: value };
    setLocalElements(prev => prev.map(el => el.id === selectedElement.id ? updated : el));
    
    // Debounce save to backend to keep typing smooth and prevent focus loss
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateScadaElement(activeWindow.id, selectedElement.id, { [field]: value });
    }, 350);
  };

  // Immediate save on blur or button click
  const handleInspectorBlur = (field, value) => {
    if (!selectedElement || !activeWindow) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    updateScadaElement(activeWindow.id, selectedElement.id, { [field]: value });
  };

  // Rotate Selected Element (0, 90, 180, 270)
  const handleRotateElement = (deg) => {
    if (!selectedElement || !activeWindow) return;
    const currentRot = Number(selectedElement.rotation) || 0;
    const nextRot = deg !== undefined ? deg : (currentRot + 90) % 360;
    handleInspectorChange('rotation', nextRot);
  };

  // Bring Selected Element to Front
  const handleBringToFront = () => {
    if (!selectedElement || !activeWindow) return;
    setLocalElements(prev => {
      const remaining = prev.filter(el => el.id !== selectedElement.id);
      return [...remaining, selectedElement];
    });
    showToast?.(`Brought ${selectedElement.label || selectedElement.type} to front`, 'info');
  };

  // Send Selected Element to Back
  const handleSendToBack = () => {
    if (!selectedElement || !activeWindow) return;
    setLocalElements(prev => {
      const remaining = prev.filter(el => el.id !== selectedElement.id);
      return [selectedElement, ...remaining];
    });
    showToast?.(`Sent ${selectedElement.label || selectedElement.type} to back`, 'info');
  };

  // Snap Selected Element to Grid
  const handleSnapSelectedToGrid = () => {
    if (!selectedElement || !activeWindow) return;
    const g = activeWindow.grid_size || 20;
    const nx = Math.round((Number(selectedElement.x) || 0) / g) * g;
    const ny = Math.round((Number(selectedElement.y) || 0) / g) * g;
    handleInspectorChange('x', Math.max(0, Math.min(1040, nx)));
    handleInspectorChange('y', Math.max(0, Math.min(560, ny)));
    showToast?.(`Snapped to ${g}px grid`, 'info');
  };

  // Nudge Selected Element via D-Pad in Inspector
  const handleNudge = (dx, dy) => {
    if (!selectedElement || !activeWindow) return;
    const curX = Number(selectedElement.x) || 0;
    const curY = Number(selectedElement.y) || 0;
    const nx = Math.max(0, Math.min(1040, curX + dx));
    const ny = Math.max(0, Math.min(560, curY + dy));
    handleInspectorChange('x', nx);
    handleInspectorChange('y', ny);
  };

  // Center Selected Element on Canvas
  const handleCenterElement = () => {
    if (!selectedElement || !activeWindow) return;
    const w = Number(selectedElement.width) || 60;
    const h = Number(selectedElement.height) || 60;
    const nx = Math.round((1060 - w) / 2);
    const ny = Math.round((580 - h) / 2);
    handleInspectorChange('x', nx);
    handleInspectorChange('y', ny);
    showToast?.(`Centered ${selectedElement.label} at (${nx}, ${ny})`, 'info');
  };

  // Center Selected Element Horizontally
  const handleCenterElementHorizontal = () => {
    if (!selectedElement || !activeWindow) return;
    const w = Number(selectedElement.width) || 60;
    const nx = Math.round((1060 - w) / 2);
    handleInspectorChange('x', nx);
    showToast?.(`Centered horizontally at X:${nx}`, 'info');
  };

  // Align Selected Element to Center Machinery Row (Y: 380)
  const handleAlignToMachineryRow = () => {
    if (!selectedElement || !activeWindow) return;
    handleInspectorChange('y', 380);
    showToast?.(`Aligned ${selectedElement.label} to Machinery Row (Y: 380)`, 'info');
  };

  // Auto-Align & Distribute all Machinery Train Elements Centered at Y: 380
  const handleAlignAllMachineryCenter = () => {
    if (!activeWindow) return;
    const machineryTypes = ['CentrifugalPump', 'PositiveDispPump', 'AirBlower', 'Compressor', 'AgitatorMotor'];
    const machineryElems = localElements.filter(el => machineryTypes.includes(el.type));
    if (machineryElems.length === 0) {
      showToast?.('No machinery elements found on canvas to align', 'info');
      return;
    }
    const sorted = [...machineryElems].sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0));
    const targetY = 380;
    const count = sorted.length;
    const totalW = sorted.reduce((sum, el) => sum + (Number(el.width) || 54), 0);
    const availableW = 860;
    const gap = Math.max(30, Math.min(80, Math.round((availableW - totalW) / (count + 1))));
    const startX = Math.round((1060 - (totalW + gap * (count - 1))) / 2);

    let curX = Math.max(40, startX);
    const updates = {};
    sorted.forEach((el) => {
      const w = Number(el.width) || 54;
      updates[el.id] = { x: curX, y: targetY };
      curX += w + gap;
    });

    setLocalElements(prev => prev.map(el => {
      if (updates[el.id]) {
        updateScadaElement(activeWindow.id, el.id, updates[el.id]);
        return { ...el, ...updates[el.id] };
      }
      return el;
    }));
    showToast?.(`Aligned ${count} machinery elements horizontally in center portion (Y: 380)`, 'success');
  };

  // Open Tag Mapping Studio for an Element
  const handleOpenTagMapping = (element) => {
    setMappingElement({
      ...element,
      temp_tag: element.mapped_tag || '',
      temp_property: element.bound_property || 'value',
      temp_units: element.units || '',
      temp_min: element.min_val || 0,
      temp_max: element.max_val || 100,
      temp_hh: element.alarm_hh || 90,
      temp_ll: element.alarm_ll || 10
    });
    setSimulatedTestValue(null);
    setIsTagMappingModalOpen(true);
  };

  // Commit Tag Mapping to Element
  const handleSaveTagMapping = async () => {
    if (!mappingElement || !activeWindow) return;
    const chosenTag = availableTags.find(t => t.tag_name === mappingElement.temp_tag);
    const updatedData = {
      ...mappingElement,
      mapped_tag: mappingElement.temp_tag,
      bound_property: mappingElement.temp_property,
      source_type: chosenTag?.source || mappingElement.source_type || 'CENTUM_VP',
      units: mappingElement.temp_units || chosenTag?.eng_units || '',
      min_val: Number(mappingElement.temp_min),
      max_val: Number(mappingElement.temp_max),
      alarm_hh: Number(mappingElement.temp_hh),
      alarm_ll: Number(mappingElement.temp_ll)
    };

    delete updatedData.temp_tag;
    delete updatedData.temp_property;
    delete updatedData.temp_units;
    delete updatedData.temp_min;
    delete updatedData.temp_max;
    delete updatedData.temp_hh;
    delete updatedData.temp_ll;

    await updateScadaElement(activeWindow.id, mappingElement.id, updatedData);
    setLocalElements(prev => prev.map(el => el.id === mappingElement.id ? { ...el, ...updatedData } : el));
    setIsTagMappingModalOpen(false);
    showToast?.(`Mapped ${updatedData.label} to ${updatedData.mapped_tag}`, 'success');
  };

  // Create Window Submit
  const handleCreateWindowSubmit = async (e) => {
    e.preventDefault();
    if (!newWindowForm.title) return;
    const targetAsset = assets.find(a => a.id === newWindowForm.asset_id);
    const created = await createScadaWindow({
      ...newWindowForm,
      asset_name: targetAsset?.name || 'Assigned Asset',
      elements: []
    });
    if (created) {
      setActiveWindowId(created.id);
      setLocalElements([]);
      setSelectedElementId(null);
      setIsCreateWindowModalOpen(false);
      setNewWindowForm({
        title: '',
        description: '',
        asset_id: assets[0]?.id || '',
        width: 1060,
        height: 580,
        background_color: '#020617',
        grid_size: 20
      });
      showToast?.(`Created new empty SCADA Window: ${created.title}`, 'success');
    }
  };

  // Handle Faceplate SP Writeback
  const handleFaceplateApply = async () => {
    if (!faceplateForm.tag) return;
    try {
      await fetch('/api/v1/dm/broker/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceid: 'cdu-controller-hub-01',
          tag_name: faceplateForm.tag,
          sp: faceplateForm.sp,
          mv: faceplateForm.mv,
          mode: faceplateForm.mode,
          timestamp: new Date().toISOString()
        })
      });

      setTelemetry(prev => ({
        ...prev,
        [faceplateForm.tag]: {
          ...prev[faceplateForm.tag],
          sp: faceplateForm.sp,
          mv: faceplateForm.mv
        }
      }));
      showToast?.(`Applied Setpoint SP=${faceplateForm.sp} to ${faceplateForm.tag}`, 'success');
      setSelectedTagForFaceplate(null);
    } catch (err) {
      console.error('Error applying faceplate:', err);
    }
  };

  // Pipe flow speed CSS class
  const getPipeFlowClass = () => {
    if (flowSpeed === 'paused') return '';
    if (flowSpeed === 'fast') return 'scada-pipe-flow-fast';
    if (flowSpeed === 'slow') return 'scada-pipe-flow-slow';
    return 'scada-pipe-flow-forward';
  };

  const sumpLevelPct = Math.min(100, Math.max(0, telemetry['LIC_101.PV']?.value || 0));
  const cduLiquidHeight = (sumpLevelPct / 100) * 80;

  // Filter available tags for mapping dialog
  const filteredTagsForMapping = availableTags.filter(t => {
    const q = tagSearchQuery.toLowerCase();
    const matchesSearch = t.tag_name.toLowerCase().includes(q) || t.display_name.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (tagSourceFilter === 'ALL') return true;
    return t.source?.includes(tagSourceFilter);
  });

  // Filtered Toolbox Items for Component Palette
  const filteredToolboxItems = FUXA_TOOLBOX_ITEMS.filter(item => {
    const matchesCat = paletteCategory === 'ALL' || item.category === paletteCategory;
    const q = paletteSearch.toLowerCase().trim();
    const matchesSearch = !q || 
      item.name.toLowerCase().includes(q) || 
      item.type.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950 overflow-hidden text-slate-100 w-full">
      
      {/* ==================================================================== */}
      {/* 1. SCADA HEADER & CONTROL BAR (Fully Responsive Layout)               */}
      {/* ==================================================================== */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 backdrop-blur shadow-md shrink-0 z-30">
        
        {/* Left: Window Selector & Creator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-inner flex-shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 hidden sm:inline">Window:</span>
              <select
                value={activeWindowId}
                onChange={(e) => setActiveWindowId(e.target.value)}
                className="bg-slate-800/90 border border-slate-700 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none max-w-[210px] truncate"
              >
                {scadaWindows.length === 0 ? (
                  <option value="">No SCADA Windows</option>
                ) : (
                  scadaWindows.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.id === activeWindowId ? localElements.length : (w.elements?.length || 0)} el)
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => setIsCreateWindowModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition"
                title="Create a New SCADA Process Window"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 hidden md:inline-block border border-slate-700/60">
                {activeWindow?.asset_name || 'Yokogawa Energy'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Operating Modes Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
          <button
            onClick={() => setMode('engineering')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              mode === 'engineering'
                ? 'bg-cyan-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="FUXA Canvas Editor: Place, move, resize, rotate, and inspect industrial elements"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setMode('runtime')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              mode === 'runtime'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Operator Runtime: Real-time plant telemetry & interactive pumps/valves"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Runtime</span>
          </button>
          <button
            onClick={() => setMode('protocols')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              mode === 'protocols'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Industrial Protocols Gateway Status (OPC UA, MQTT, V8 FB, WebSocket)"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Protocols</span>
          </button>
        </div>

        {/* Right: Engineering Tools & Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {mode === 'engineering' && (
            <>
              {/* Palette Toggle */}
              <button
                onClick={() => setIsToolboxOpen(!isToolboxOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                  isToolboxOpen 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Component Palette"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Palette ({filteredToolboxItems.length})</span>
              </button>

              {/* Inspector Toggle */}
              <button
                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                  isInspectorOpen 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Element Property Inspector"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Inspector</span>
              </button>

              {/* Snap to Grid */}
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  snapToGrid 
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title={snapToGrid ? "Snap to Grid ON (20px)" : "Snap to Grid OFF"}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono hidden sm:inline">20px</span>
              </button>

              {/* Add Pipe Line Button */}
              <button
                onClick={handleAddLine}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition shadow-sm"
                title="Add an editable process pipe line onto the canvas"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Pipe Line</span>
              </button>
            </>
          )}

          {/* Flow Speed Controls */}
          <select
            value={flowSpeed}
            onChange={(e) => setFlowSpeed(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            title="Flow Simulation Speed"
          >
            <option value="normal">Flow: Normal</option>
            <option value="fast">Flow: Fast</option>
            <option value="slow">Flow: Slow</option>
            <option value="paused">Flow: Paused</option>
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span 
              onClick={() => setZoomLevel(1)} 
              className="text-[11px] font-mono px-1.5 text-slate-300 cursor-pointer hover:text-cyan-400"
              title="Click to reset to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.5, Number((prev + 0.1).toFixed(1))))}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fast Quick Save in Header */}
          <button
            onClick={() => {
              if (activeWindow) {
                updateScadaWindow(activeWindow.id, {
                  ...activeWindow,
                  elements: localElements
                });
                showToast?.('SCADA window layout saved to PostgreSQL', 'success');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-sm text-xs transition"
            title="Save Layout to Database"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MAIN SCADA WORKSPACE (Toolbox + Canvas + Inspector)               */}
      {/* ==================================================================== */}
      <div className="relative flex flex-1 min-h-0 h-full overflow-hidden bg-slate-950">
        
        {/* ------------------------------------------------------------------ */}
        {/* A. FUXA ELEMENT TOOLBOX SIDEBAR (Collapsible Palette with Search)  */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'engineering' && isToolboxOpen && (
          <div className="w-64 md:w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-20 shadow-2xl overflow-hidden">
            {/* Palette Header */}
            <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Palette
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {filteredToolboxItems.length} components
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsToolboxOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title="Collapse Palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-2.5 bg-slate-950/40 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={paletteSearch}
                  onChange={(e) => setPaletteSearch(e.target.value)}
                  placeholder="Search components..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {paletteSearch && (
                  <button
                    onClick={() => setPaletteSearch('')}
                    className="absolute right-2 top-2 text-slate-500 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pt-2 pb-0.5 text-[10px] font-semibold no-scrollbar">
                {['ALL', 'Vessels', 'Machinery', 'Valves', 'Heat Transfer', 'Piping', 'Meters & HMI', 'Logic & FB'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPaletteCategory(cat)}
                    className={`px-2 py-0.5 rounded-full flex-shrink-0 transition border ${
                      paletteCategory === cat
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Component Cards Grid */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredToolboxItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 italic">
                  No components match "{paletteSearch}"
                </div>
              ) : (
                filteredToolboxItems.map(item => (
                  <div
                    key={item.type}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/fuxa-element', JSON.stringify(item));
                    }}
                    onClick={() => handleAddToolboxElement(item)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-cyan-500/60 hover:bg-slate-850 text-left transition cursor-grab active:cursor-grabbing group shadow-sm"
                    title="Click to place or drag onto canvas"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-500/30 flex-shrink-0 transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-200 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900/80 flex-shrink-0">
                      {item.defaultW}x{item.defaultH}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* B. INTERACTIVE SCADA CANVAS                                        */}
        {/* ------------------------------------------------------------------ */}
        <div 
          className="relative flex-1 h-full min-h-0 bg-slate-950 overflow-auto p-3 sm:p-4 flex flex-col items-center justify-start select-none"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleDropOnCanvas}
        >
          {/* Canvas Background Grid */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none scada-canvas-grid" 
            style={{
              backgroundSize: `${activeWindow?.grid_size || 20}px ${activeWindow?.grid_size || 20}px`
            }}
          />

          {/* PROTOCOLS VIEW */}
          {mode === 'protocols' ? (
            <div className="relative z-10 w-full max-w-4xl p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  Industrial Protocols & DM Tag Gateway Health
                </h3>
                <button
                  onClick={() => setMode('engineering')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg"
                >
                  Return to Canvas
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 font-bold">WebSocket Realtime:</span> CONNECTED (ws://127.0.0.1:8000/ws/telemetry)
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-cyan-400 font-bold">OPC UA Gateway:</span> ONLINE (opc.tcp://127.0.0.1:4840/yokogawa/server)
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-purple-400 font-bold">V8 Function Block Engine:</span> ACTIVE (Node.js Isolated Sandbox)
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-amber-400 font-bold">MQTT DM Ingest:</span> READY (/api/v1/dm/broker/ingest)
                </div>
              </div>
            </div>
          ) : (
            /* SCADA SYNOPTIC SVG CANVAS */
            <div className="relative z-10 flex flex-col items-center">
              {/* Canvas Sub-Bar Info */}
              <div className="w-full max-w-[1060px] flex items-center justify-between mb-2 px-1 text-xs text-slate-400">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    {activeWindow?.title || 'SCADA Canvas'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">1060 × 580 px</span>
                  {selectedElement ? (
                    <span className="text-[11px] font-mono text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                      Selected: {selectedElement.label || selectedElement.type} ({selectedElement.x}, {selectedElement.y})
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                      Click any element to select & edit attributes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {mode === 'engineering' && (
                    <button
                      onClick={handleAlignAllMachineryCenter}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold transition shadow-sm active:scale-95"
                      title="Auto-align and distribute all rotating machinery equipment centered along row Y: 380"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Align Machinery (Center)
                    </button>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono">
                    Snap: {snapToGrid ? `${activeWindow?.grid_size || 20}px` : 'Free'}
                  </span>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                    title="Reset Zoom to 100%"
                  >
                    Reset Zoom
                  </button>
                </div>
              </div>

              <div 
                className="relative transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
              >
                <svg 
                  ref={svgRef}
                  width="1060" 
                  height="580" 
                  viewBox="0 0 1060 580" 
                  className="select-none overflow-visible drop-shadow-2xl border border-slate-800/80 rounded-xl bg-slate-950/95"
                  onClick={(e) => {
                    // Deselect only when clicking blank canvas background
                    if (e.target === svgRef.current || e.target.id === 'scada-canvas-bg' || e.target.tagName === 'svg') {
                      setSelectedElementId(null);
                    }
                  }}
                >
                  <defs>
                    {/* Steel Gradient */}
                    <linearGradient id="tankSteelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="45%" stopColor="#475569" />
                      <stop offset="55%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>

                    {/* Water Gradient */}
                    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
                    </linearGradient>

                    {/* Hydrocarbon Oil Gradient */}
                    <linearGradient id="oilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity="0.95" />
                    </linearGradient>

                    {/* Furnace Fire Gradient */}
                    <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#dc2626" />
                      <stop offset="50%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#facc15" />
                    </linearGradient>

                    {/* Copper Heating Coil */}
                    <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#b45309" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>

                  {/* Explicit background rect to catch empty space clicks */}
                  <rect 
                    id="scada-canvas-bg" 
                    x="0" 
                    y="0" 
                    width="1060" 
                    height="580" 
                    fill="transparent" 
                  />

                  {/* ========================================================== */}
                  {/* Process Piping & Conduits (100% Fully Editable)            */}
                  {/* ========================================================== */}
                  <g className="scada-editable-piping">
                    {localLines.map((line) => {
                      const isSelected = selectedLineId === line.id;
                      return (
                        <g 
                          key={line.id}
                          id={`scada-line-${line.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLineId(line.id);
                            setSelectedElementId(null);
                            setIsInspectorOpen(true);
                          }}
                          className="cursor-pointer group"
                        >
                          {/* Hitbox area for easy clicking */}
                          <path 
                            d={line.path} 
                            fill="none" 
                            stroke="transparent" 
                            strokeWidth={Math.max(16, (Number(line.width) || 5) + 12)} 
                          />
                          {/* Outer steel pipe casing */}
                          <path 
                            d={line.path} 
                            fill="none" 
                            stroke={isSelected ? "#38bdf8" : "#1e293b"} 
                            strokeWidth={(Number(line.width) || 5) + (isSelected ? 8 : 6)} 
                            strokeLinecap="round" 
                            className="transition-colors"
                          />
                          {/* Inner dynamic fluid stream */}
                          <path 
                            d={line.path} 
                            fill="none" 
                            stroke={line.color || "#f59e0b"} 
                            strokeWidth={Number(line.width) || 5} 
                            strokeDasharray={line.animated ? "6,4" : "none"} 
                            className={line.animated ? getPipeFlowClass() : ""} 
                          />
                        </g>
                      );
                    })}
                  </g>

                  {/* ========================================================== */}
                  {/* Empty Canvas Friendly Overlay Prompt                       */}
                  {/* ========================================================== */}
                  {localElements.length === 0 && (
                    <g className="pointer-events-none select-none">
                      <rect x="230" y="200" width="600" height="170" rx="16" fill="rgba(15, 23, 42, 0.7)" stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="6,4" />
                      <text x="530" y="255" textAnchor="middle" fill="#38bdf8" fontSize="16" fontWeight="bold">
                        Empty SCADA Process Window
                      </text>
                      <text x="530" y="285" textAnchor="middle" fill="#94a3b8" fontSize="12">
                        Click any industrial component from the left palette to place it here.
                      </text>
                      <text x="530" y="312" textAnchor="middle" fill="#64748b" fontSize="11">
                        Drag elements freely anywhere with mouse • Use Inspector to map DM Tags & fine-tune coordinates
                      </text>
                    </g>
                  )}

                  {/* ========================================================== */}
                  {/* Render Canvas Elements                                     */}
                  {/* ========================================================== */}
                  {localElements.map((el) => {
                    const isSelected = selectedElementId === el.id;
                    const liveTag = telemetry[el.mapped_tag];
                    const liveVal = liveTag ? liveTag.value : (el.value || 0);
                    const rot = Number(el.rotation) || 0;
                    const elW = Number(el.width) || 40;
                    const elH = Number(el.height) || 40;
                    const transformStr = rot 
                      ? `translate(${el.x}, ${el.y}) rotate(${rot} ${elW / 2} ${elH / 2})` 
                      : `translate(${el.x}, ${el.y})`;

                    return (
                      <g 
                        key={el.id}
                        id={`scada-element-${el.id}`}
                        transform={transformStr}
                        className={`select-none ${mode === 'engineering' ? 'cursor-move' : 'cursor-pointer'}`}
                        style={{ touchAction: 'none' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                          setIsInspectorOpen(true);
                        }}
                        onPointerDown={(e) => handleElementPointerDown(e, el)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleOpenTagMapping(el);
                        }}
                      >
                      {/* Selection Bounding Outline & Drag Handle */}
                      {mode === 'engineering' && isSelected && (
                        <g className="pointer-events-none">
                          <rect
                            x="-6"
                            y="-6"
                            width={Number(el.width) + 12}
                            height={Number(el.height) + 12}
                            fill="rgba(56, 189, 248, 0.1)"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="4,3"
                            rx="5"
                          />
                          {/* Corner Handles */}
                          <circle cx="-6" cy="-6" r="4" fill="#38bdf8" />
                          <circle cx={Number(el.width) + 6} cy="-6" r="4" fill="#38bdf8" />
                          <circle cx="-6" cy={Number(el.height) + 6} r="4" fill="#38bdf8" />
                          <circle cx={Number(el.width) + 6} cy={Number(el.height) + 6} r="4" fill="#38bdf8" />

                          {/* Coordinates Tooltip */}
                          <text 
                            x="0" 
                            y="-10" 
                            fill="#38bdf8" 
                            fontSize="9" 
                            fontWeight="bold" 
                            fontFamily="monospace"
                          >
                            X:{el.x} Y:{el.y}
                          </text>
                        </g>
                      )}

                      {/* 1. StorageTank */}
                      {el.type === 'StorageTank' && (
                        <g>
                          <rect x="0" y="20" width={el.width} height={el.height - 20} rx="6" fill="url(#tankSteelGrad)" stroke="#475569" strokeWidth="2" />
                          <ellipse cx={el.width / 2} cy="20" rx={el.width / 2} ry="12" fill="#334155" stroke="#475569" strokeWidth="2" />
                          <rect 
                            x="4" 
                            y={20 + (el.height - 20) * (1 - Math.min(1, Math.max(0, liveVal / 100)))} 
                            width={el.width - 8} 
                            height={(el.height - 20) * Math.min(1, Math.max(0, liveVal / 100))} 
                            rx="2" 
                            fill="url(#oilGrad)" 
                          />
                          <text x={el.width / 2} y={el.height / 2 + 10} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                            {Number(liveVal).toFixed(0)} %
                          </text>
                          <text x={el.width / 2} y={el.height + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                            {el.label}
                          </text>
                        </g>
                      )}

                      {/* 2. ProcessColumn */}
                      {el.type === 'ProcessColumn' && (
                        <g>
                          <rect x="0" y="20" width={el.width} height={el.height - 40} rx="10" fill="url(#tankSteelGrad)" stroke="#64748b" strokeWidth="3" />
                          <ellipse cx={el.width / 2} cy="20" rx={el.width / 2} ry="18" fill="#334155" stroke="#64748b" strokeWidth="3" />
                          <ellipse cx={el.width / 2} cy={el.height - 20} rx={el.width / 2} ry="18" fill="#1e293b" stroke="#64748b" strokeWidth="3" />
                          
                          {/* Bottom Sump Liquid Wave */}
                          <rect 
                            x="4" 
                            y={el.height - 20 - cduLiquidHeight} 
                            width={el.width - 8} 
                            height={cduLiquidHeight} 
                            fill="url(#waterGrad)" 
                            rx="4"
                            className="scada-fluid-wave"
                          />

                          {/* Bubble Cap Trays */}
                          {[50, 90, 130, 170, 210, 250, 290].map((y, i) => (
                            <line key={i} x1="12" y1={y} x2={el.width - 12} y2={y} stroke="#475569" strokeWidth="2" strokeDasharray="6,4" />
                          ))}

                          <text x={el.width / 2} y="110" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                            {el.label}
                          </text>
                          <text x={el.width / 2} y="125" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
                            LEVEL: {Number(liveVal).toFixed(1)} %
                          </text>
                        </g>
                      )}

                      {/* 3. CentrifugalPump */}
                      {el.type === 'CentrifugalPump' && (() => {
                        const w = Number(el.width) || 54;
                        const h = Number(el.height) || 54;
                        const cx = Math.round(w / 2);
                        const cy = Math.round((h - 8) / 2);
                        const r = Math.min(cx, cy) - 3;
                        return (
                          <g>
                            {/* Volute Casing */}
                            <circle cx={cx} cy={cy} r={r} fill={pumpRunning ? '#064e3b' : '#1e293b'} stroke={pumpRunning ? '#10b981' : '#64748b'} strokeWidth="3" />
                            {/* Discharge Nozzle */}
                            <rect x={cx + r * 0.35} y={cy - r - 2} width={r * 0.55} height={r * 0.65} rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                            {/* Impeller Hub Assembly Centered at (cx, cy) with Native SVG Rotation */}
                            <g transform={`translate(${cx}, ${cy})`}>
                              <g>
                                {pumpRunning && flowSpeed !== 'paused' && (
                                  <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 0 0"
                                    to="360 0 0"
                                    dur={flowSpeed === 'fast' ? "0.6s" : flowSpeed === 'slow' ? "2.5s" : "1.5s"}
                                    repeatCount="indefinite"
                                  />
                                )}
                                <circle cx="0" cy="0" r={r * 0.22} fill="#ffffff" />
                                {[0, 60, 120, 180, 240, 300].map((deg) => (
                                  <line
                                    key={deg}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2={-r * 0.8}
                                    transform={`rotate(${deg} 0 0)`}
                                    stroke="#ffffff"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                  />
                                ))}
                                <circle cx="0" cy="0" r={r * 0.1} fill="#0f172a" />
                              </g>
                            </g>
                            <text x={cx} y={h + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{el.label}</text>
                          </g>
                        );
                      })()}

                      {/* 4. PositiveDispPump */}
                      {el.type === 'PositiveDispPump' && (() => {
                        const w = Number(el.width) || 56;
                        const h = Number(el.height) || 44;
                        const cx = Math.round(w / 2);
                        const cy = Math.round((h - 8) / 2);
                        return (
                          <g>
                            <rect x="2" y={cy - 14} width={Math.round(w * 0.62)} height="28" rx="4" fill="#334155" stroke="#64748b" strokeWidth="2" />
                            <rect x={Math.round(w * 0.6)} y={cy - 9} width={Math.round(w * 0.36)} height="18" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                            <circle cx={Math.round(w * 0.32)} cy={cy} r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                            <text x={cx} y={h + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{el.label}</text>
                          </g>
                        );
                      })()}

                      {/* 5. AirBlower (Centrifugal / Forced Draft Fan) */}
                      {el.type === 'AirBlower' && (() => {
                        const w = Number(el.width) || 56;
                        const h = Number(el.height) || 56;
                        const cx = Math.round(w / 2);
                        const cy = Math.round((h - 8) / 2);
                        const r = Math.min(cx, cy) - 3;
                        return (
                          <g>
                            {/* Tangential Scroll Discharge Duct */}
                            <rect x={cx} y={cy - r - 3} width={r * 0.72} height={r * 0.8} rx="2" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
                            {/* Outer Casing */}
                            <circle cx={cx} cy={cy} r={r} fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
                            {/* Inner Inlet Shroud */}
                            <circle cx={cx} cy={cy} r={r * 0.68} fill="#0f172a" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,2" />
                            {/* Multi-Blade Impeller Fan Assembly Centered at (cx, cy) */}
                            <g transform={`translate(${cx}, ${cy})`}>
                              <g>
                                {pumpRunning && flowSpeed !== 'paused' && (
                                  <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 0 0"
                                    to="360 0 0"
                                    dur={flowSpeed === 'fast' ? "0.5s" : flowSpeed === 'slow' ? "2.2s" : "1.2s"}
                                    repeatCount="indefinite"
                                  />
                                )}
                                {[0, 60, 120, 180, 240, 300].map((deg) => (
                                  <path
                                    key={deg}
                                    d={`M 0 0 Q ${r * 0.4} ${-r * 0.3} ${r * 0.72} 0 Z`}
                                    transform={`rotate(${deg} 0 0)`}
                                    fill="#38bdf8"
                                    stroke="#0284c7"
                                    strokeWidth="0.8"
                                  />
                                ))}
                                <circle cx="0" cy="0" r={r * 0.22} fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                                <circle cx="0" cy="0" r={r * 0.08} fill="#0f172a" />
                              </g>
                            </g>
                            <text x={cx} y={h + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{el.label}</text>
                          </g>
                        );
                      })()}

                      {/* 6. Compressor (Gas Compressor) */}
                      {el.type === 'Compressor' && (() => {
                        const w = Number(el.width) || 72;
                        const h = Number(el.height) || 48;
                        const cx = Math.round(w / 2);
                        const cy = Math.round((h - 8) / 2);
                        return (
                          <g>
                            {/* Mounting Base */}
                            <rect x="6" y={cy + h * 0.38} width={w - 12} height="4" rx="1" fill="#475569" stroke="#64748b" strokeWidth="1" />
                            {/* Tapered Compressor Body */}
                            <polygon 
                              points={`4,${cy - h * 0.36} ${w - 4},${cy - h * 0.16} ${w - 4},${cy + h * 0.16} 4,${cy + h * 0.36}`} 
                              fill="url(#tankSteelGrad)" 
                              stroke="#64748b" 
                              strokeWidth="2" 
                            />
                            {/* Internal Rotor Chamber */}
                            <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.22} fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                            {/* Spinning Vanes Assembly Centered at (cx, cy) */}
                            <g transform={`translate(${cx}, ${cy})`}>
                              <g>
                                {pumpRunning && flowSpeed !== 'paused' && (
                                  <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 0 0"
                                    to="360 0 0"
                                    dur={flowSpeed === 'fast' ? "0.5s" : "1.2s"}
                                    repeatCount="indefinite"
                                  />
                                )}
                                <line x1="-8" y1="0" x2="8" y2="0" stroke="#38bdf8" strokeWidth="2" />
                                <line x1="0" y1="-8" x2="0" y2="8" stroke="#38bdf8" strokeWidth="2" />
                                <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                              </g>
                            </g>
                            <text x={cx} y={h + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{el.label}</text>
                          </g>
                        );
                      })()}

                      {/* 7. AgitatorMotor (Top Drive Agitator) */}
                      {el.type === 'AgitatorMotor' && (() => {
                        const w = Number(el.width) || 52;
                        const h = Number(el.height) || 56;
                        const cx = Math.round(w / 2);
                        const motorW = Math.round(w * 0.68);
                        const motorH = Math.round(h * 0.42);
                        const motorX = Math.round(cx - motorW / 2);
                        const flangeW = Math.round(w * 0.85);
                        const flangeX = Math.round(cx - flangeW / 2);
                        return (
                          <g>
                            {/* Motor Top Body with Cooling Fins */}
                            <rect x={motorX} y="2" width={motorW} height={motorH} rx="4" fill="#1e1b4b" stroke="#a855f7" strokeWidth="2" />
                            {/* Cooling Ribs */}
                            <line x1={motorX + 4} y1="6" x2={motorX + motorW - 4} y2="6" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
                            <line x1={motorX + 4} y1="10" x2={motorX + motorW - 4} y2="10" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
                            <line x1={motorX + 4} y1="14" x2={motorX + motorW - 4} y2="14" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
                            {/* Gearbox Reducer */}
                            <rect x={cx - motorW * 0.35} y={2 + motorH} width={motorW * 0.7} height={Math.round(h * 0.18)} fill="#312e81" stroke="#a855f7" strokeWidth="1.5" />
                            {/* Mounting Flange */}
                            <line x1={flangeX} y1={2 + motorH + Math.round(h * 0.18)} x2={flangeX + flangeW} y2={2 + motorH + Math.round(h * 0.18)} stroke="#a855f7" strokeWidth="3" />
                            {/* Agitator Drive Shaft */}
                            <line x1={cx} y1={2 + motorH + Math.round(h * 0.18)} x2={cx} y2={h - 6} stroke="#c084fc" strokeWidth="3" />
                            {/* Agitator Impeller / Hydrofoil Blades Assembly at the bottom */}
                            <g transform={`translate(${cx}, ${h - 6})`}>
                              <g>
                                {pumpRunning && flowSpeed !== 'paused' && (
                                  <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 0 0"
                                    to="360 0 0"
                                    dur={flowSpeed === 'fast' ? "0.8s" : "2s"}
                                    repeatCount="indefinite"
                                  />
                                )}
                                <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                                <line x1="-12" y1="0" x2="12" y2="0" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                                <circle cx="-12" cy="0" r="2.5" fill="#c084fc" />
                                <circle cx="12" cy="0" r="2.5" fill="#c084fc" />
                              </g>
                            </g>
                            <text x={cx} y={h + 14} textAnchor="middle" fill="#c084fc" fontSize="9" fontWeight="bold">{el.label}</text>
                          </g>
                        );
                      })()}

                      {/* 8. CSTRReactor */}
                      {el.type === 'CSTRReactor' && (
                        <g>
                          <rect x={el.width / 2 - 12} y="0" width="24" height="20" rx="3" fill="#334155" stroke="#a855f7" strokeWidth="1.5" />
                          <rect x="5" y="20" width={el.width - 10} height={el.height - 35} rx="8" fill="url(#tankSteelGrad)" stroke="#64748b" strokeWidth="2" />
                          <path d={`M 0 35 L 5 35 L 5 ${el.height - 25} L 0 ${el.height - 25}`} stroke="#38bdf8" strokeWidth="3" fill="none" />
                          <path d={`M ${el.width} 35 L ${el.width - 5} 35 L ${el.width - 5} ${el.height - 25} L ${el.width} ${el.height - 25}`} stroke="#38bdf8" strokeWidth="3" fill="none" />
                          <line x1={el.width / 2} y1="20" x2={el.width / 2} y2={el.height - 30} stroke="#94a3b8" strokeWidth="3" />
                          <line x1={el.width / 2 - 18} y1={el.height - 40} x2={el.width / 2 + 18} y2={el.height - 40} stroke="#94a3b8" strokeWidth="4" />
                          <text x={el.width / 2} y={el.height / 2 + 8} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 9. SphericalTank */}
                      {el.type === 'SphericalTank' && (
                        <g>
                          <line x1="16" y1="50" x2="8" y2="90" stroke="#475569" strokeWidth="3" />
                          <line x1="69" y1="50" x2="77" y2="90" stroke="#475569" strokeWidth="3" />
                          <circle cx="42" cy="42" r="38" fill="url(#tankSteelGrad)" stroke="#06b6d4" strokeWidth="2.5" />
                          <circle cx="42" cy="42" r="28" fill="#1e293b" opacity="0.6" />
                          <text x="42" y="44" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
                            {Number(liveVal).toFixed(0)} %
                          </text>
                          <text x="42" y="104" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 10. HopperSilo */}
                      {el.type === 'HopperSilo' && (
                        <g>
                          <rect x="5" y="5" width={el.width - 10} height="65" rx="3" fill="url(#tankSteelGrad)" stroke="#64748b" strokeWidth="2" />
                          <polygon points={`5,70 ${el.width - 5},70 ${el.width / 2 + 8},105 ${el.width / 2 - 8},105`} fill="#334155" stroke="#64748b" strokeWidth="2" />
                          <text x={el.width / 2} y="45" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 11. Decanter */}
                      {el.type === 'Decanter' && (
                        <g>
                          <rect x="0" y="4" width={el.width} height={el.height - 8} rx="12" fill="url(#tankSteelGrad)" stroke="#06b6d4" strokeWidth="2" />
                          <line x1={el.width / 2} y1="8" x2={el.width / 2} y2={el.height - 8} stroke="#38bdf8" strokeWidth="2" strokeDasharray="3,3" />
                          <text x={el.width / 2} y={el.height / 2 + 3} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 12. FlashDrum */}
                      {el.type === 'FlashDrum' && (
                        <g>
                          <rect x="5" y="15" width={el.width - 10} height={el.height - 30} rx="14" fill="url(#tankSteelGrad)" stroke="#64748b" strokeWidth="2" />
                          <text x={el.width / 2} y={el.height / 2 + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 13. Process Pipe Horizontal */}
                      {el.type === 'PipeHorizontal' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                          <line x1="2" y1={el.height / 2} x2={el.width - 2} y2={el.height / 2} stroke="#38bdf8" strokeWidth="4" className={getPipeFlowClass()} />
                          <text x={el.width / 2} y={el.height + 11} textAnchor="middle" fill="#64748b" fontSize="8 font-mono">{el.label}</text>
                        </g>
                      )}

                      {/* 14. Process Pipe Vertical */}
                      {el.type === 'PipeVertical' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                          <line x1={el.width / 2} y1="2" x2={el.width / 2} y2={el.height - 2} stroke="#38bdf8" strokeWidth="4" className={getPipeFlowClass()} />
                          <text x={el.width + 12} y={el.height / 2} textAnchor="start" fill="#64748b" fontSize="8 font-mono">{el.label}</text>
                        </g>
                      )}

                      {/* 15. Pipe Elbow */}
                      {el.type === 'PipeElbow' && (
                        <g>
                          <path d={`M 0 ${el.height / 2} Q ${el.width / 2} ${el.height / 2} ${el.width / 2} 0`} fill="none" stroke="#1e293b" strokeWidth="10" />
                          <path d={`M 0 ${el.height / 2} Q ${el.width / 2} ${el.height / 2} ${el.width / 2} 0`} fill="none" stroke="#38bdf8" strokeWidth="4" className={getPipeFlowClass()} />
                          <text x={el.width / 2 + 5} y={el.height / 2 + 12} textAnchor="start" fill="#64748b" fontSize="8 font-mono">{el.label}</text>
                        </g>
                      )}

                      {/* 16. ControlValve */}
                      {el.type === 'ControlValve' && (
                        <g>
                          <ellipse cx="17" cy="2" rx="12" ry="7" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                          <line x1="17" y1="9" x2="17" y2="15" stroke="#f59e0b" strokeWidth="2" />
                          <polygon points="5,7 29,23 5,23" fill="#f59e0b" />
                          <polygon points="29,7 5,23 29,23" fill="#f59e0b" />
                          <text x="17" y="34" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 17. GateValve */}
                      {el.type === 'GateValve' && (
                        <g>
                          <ellipse cx="14" cy="2" rx="8" ry="3" fill="#64748b" />
                          <line x1="14" y1="5" x2="14" y2="11" stroke="#64748b" strokeWidth="1.5" />
                          <polygon points="3,6 25,18 3,18" fill="#64748b" />
                          <polygon points="25,6 3,18 25,18" fill="#64748b" />
                          <text x="14" y="28" textAnchor="middle" fill="#94a3b8" fontSize="8">{el.label}</text>
                        </g>
                      )}

                      {/* 18. BallValve */}
                      {el.type === 'BallValve' && (
                        <g>
                          <line x1="14" y1="2" x2="24" y2="2" stroke="#10b981" strokeWidth="2" />
                          <polygon points="3,7 25,19 3,19" fill="#10b981" />
                          <polygon points="25,7 3,19 25,19" fill="#10b981" />
                          <circle cx="14" cy="13" r="3" fill="#ffffff" />
                          <text x="14" y="28" textAnchor="middle" fill="#10b981" fontSize="8">{el.label}</text>
                        </g>
                      )}

                      {/* 19. ThreeWayValve */}
                      {el.type === 'ThreeWayValve' && (
                        <g>
                          <polygon points="5,7 29,21 5,21" fill="#06b6d4" />
                          <polygon points="29,7 5,21 29,21" fill="#06b6d4" />
                          <polygon points="10,21 24,21 17,32" fill="#06b6d4" />
                          <text x="17" y="42" textAnchor="middle" fill="#06b6d4" fontSize="8">{el.label}</text>
                        </g>
                      )}

                      {/* 20. SafetyValve */}
                      {el.type === 'SafetyValve' && (
                        <g>
                          <polygon points="5,15 25,15 15,25" fill="#f43f5e" />
                          <rect x="11" y="4" width="8" height="12" rx="2" fill="#334155" stroke="#f43f5e" strokeWidth="1.5" />
                          <path d="M 25 15 L 29 12 L 29 18 Z" fill="#f43f5e" />
                          <text x="15" y="34" textAnchor="middle" fill="#f43f5e" fontSize="8" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 21. ESDValve */}
                      {el.type === 'ESDValve' && (
                        <g>
                          <rect x="7" y="0" width="20" height="12" rx="2" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
                          <text x="17" y="9" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">ESD</text>
                          <polygon points="4,13 30,25 4,25" fill="#dc2626" />
                          <polygon points="30,13 4,25 30,25" fill="#dc2626" />
                          <text x="17" y="36" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 22. CheckValve */}
                      {el.type === 'CheckValve' && (
                        <g>
                          <polygon points="4,5 22,13 4,21" fill="#64748b" />
                          <line x1="22" y1="5" x2="22" y2="21" stroke="#64748b" strokeWidth="2" />
                          <text x="13" y="30" textAnchor="middle" fill="#64748b" fontSize="8">{el.label}</text>
                        </g>
                      )}

                      {/* 23. MotorizedValve */}
                      {el.type === 'MotorizedValve' && (
                        <g>
                          <circle cx="18" cy="8" r="7" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                          <text x="18" y="11" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">M</text>
                          <polygon points="5,16 31,28 5,28" fill="#38bdf8" />
                          <polygon points="31,16 5,28 31,28" fill="#38bdf8" />
                          <text x="18" y="38" textAnchor="middle" fill="#38bdf8" fontSize="8">{el.label}</text>
                        </g>
                      )}

                      {/* 24. HeatExchanger */}
                      {el.type === 'HeatExchanger' && (
                        <g>
                          <rect x="0" y="5" width={el.width} height={el.height - 5} rx="8" fill="url(#tankSteelGrad)" stroke="#64748b" strokeWidth="2" />
                          <path d="M 8 18 Q 20 12 35 18 T 60 18" fill="none" stroke="#f59e0b" strokeWidth="2" />
                          <text x={el.width / 2} y={el.height + 12} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 25. Reboiler */}
                      {el.type === 'Reboiler' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="6" fill="url(#tankSteelGrad)" stroke="#f43f5e" strokeWidth="2" />
                          <text x={el.width / 2} y={el.height / 2 + 4} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">STEAM E-102</text>
                        </g>
                      )}

                      {/* 26. AirCooler */}
                      {el.type === 'AirCooler' && (() => {
                        const w = Number(el.width) || 76;
                        const h = Number(el.height) || 36;
                        const f1x = Math.round(w * 0.3);
                        const f2x = Math.round(w * 0.7);
                        const fy = Math.round(h / 2);
                        return (
                          <g>
                            <rect x="0" y="0" width={w} height={h} rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                            {/* Fan 1 */}
                            <g transform={`translate(${f1x}, ${fy})`}>
                              <g>
                                {pumpRunning && flowSpeed !== 'paused' && (
                                  <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 0 0"
                                    to="360 0 0"
                                    dur={flowSpeed === 'fast' ? "0.5s" : "1.2s"}
                                    repeatCount="indefinite"
                                  />
                                )}
                                <circle cx="0" cy="0" r="10" fill="#334155" stroke="#38bdf8" strokeWidth="1" />
                                <line x1="-8" y1="0" x2="8" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                                <line x1="0" y1="-8" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1.5" />
                              </g>
                            </g>
                            {/* Fan 2 */}
                            <g transform={`translate(${f2x}, ${fy})`}>
                              <g>
                                {pumpRunning && flowSpeed !== 'paused' && (
                                  <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 0 0"
                                    to="360 0 0"
                                    dur={flowSpeed === 'fast' ? "0.5s" : "1.2s"}
                                    repeatCount="indefinite"
                                  />
                                )}
                                <circle cx="0" cy="0" r="10" fill="#334155" stroke="#38bdf8" strokeWidth="1" />
                                <line x1="-8" y1="0" x2="8" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                                <line x1="0" y1="-8" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1.5" />
                              </g>
                            </g>
                            <text x={w / 2} y={h + 14} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">{el.label}</text>
                          </g>
                        );
                      })()}

                      {/* 27. FiredHeater */}
                      {el.type === 'FiredHeater' && (
                        <g>
                          <polygon points={`10,${el.height} 10,40 ${el.width / 2 - 8},25 ${el.width / 2 - 8},5 ${el.width / 2 + 8},5 ${el.width / 2 + 8},25 ${el.width - 10},40 ${el.width - 10},${el.height}`} fill="url(#tankSteelGrad)" stroke="#ea580c" strokeWidth="2.5" />
                          <path 
                            d={`M ${el.width / 2 - 20} ${el.height - 10} Q ${el.width / 2 - 10} ${el.height - 50} ${el.width / 2} ${el.height - 40} Q ${el.width / 2 + 10} ${el.height - 55} ${el.width / 2 + 20} ${el.height - 10} Z`} 
                            fill="url(#fireGrad)"
                            className="scada-flame-anim"
                          />
                          <text x={el.width / 2} y={el.height - 20} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                            {Number(liveVal).toFixed(0)} °C
                          </text>
                          <text x={el.width / 2} y={el.height + 14} textAnchor="middle" fill="#ea580c" fontSize="9" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 28. PlateExchanger */}
                      {el.type === 'PlateExchanger' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="4" fill="#334155" stroke="#38bdf8" strokeWidth="2" />
                          {[8, 14, 20, 26, 32, 38, 44].map((x, i) => (
                            <line key={i} x1={x} y1="4" x2={x} y2={el.height - 4} stroke="#64748b" strokeWidth="1.5" />
                          ))}
                          <text x={el.width / 2} y={el.height + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">{el.label}</text>
                        </g>
                      )}

                      {/* 29. DigitalBadge */}
                      {el.type === 'DigitalBadge' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" className="scada-element-glow" />
                          <rect x="0" y="0" width={el.width} height="17" rx="8" fill="#1e293b" />
                          <text x="8" y="12" fill="#38bdf8" fontSize="9" fontWeight="bold">{el.label}</text>
                          <text x="8" y="34" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">
                            {Number(liveVal).toFixed(1)}
                          </text>
                          <text x={el.width - 8} y="34" textAnchor="end" fill="#94a3b8" fontSize="10">{el.units || liveTag?.units}</text>
                          <text x="8" y="46" fill="#64748b" fontSize="8" fontFamily="monospace">{el.mapped_tag}</text>
                        </g>
                      )}

                      {/* 30. RadialGauge */}
                      {el.type === 'RadialGauge' && (
                        <g>
                          <circle cx="42" cy="42" r="38" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" className="scada-element-glow" />
                          <path d="M 20 60 A 28 28 0 1 1 64 60" fill="none" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
                          <path d="M 20 60 A 28 28 0 0 1 42 14" fill="none" stroke="#10b981" strokeWidth="5" />
                          <path d="M 42 14 A 28 28 0 0 1 64 60" fill="none" stroke="#f43f5e" strokeWidth="5" />
                          
                          {(() => {
                            const minVal = el.min_val || 0;
                            const maxVal = el.max_val || 200;
                            const ratio = Math.min(1, Math.max(0, (liveVal - minVal) / (maxVal - minVal || 1)));
                            const angle = -135 + ratio * 270;
                            return (
                              <g style={{ transformOrigin: '42px 42px', transform: `rotate(${angle}deg)` }}>
                                <line x1="42" y1="42" x2="42" y2="18" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="42" cy="42" r="4" fill="#ffffff" />
                              </g>
                            );
                          })()}

                          <text x="42" y="60" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                            {Number(liveVal).toFixed(1)}
                          </text>
                          <text x="42" y="72" textAnchor="middle" fill="#94a3b8" fontSize="8">{el.units || 'kPa'}</text>
                          <text x="42" y="94" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 31. LevelBarMeter */}
                      {el.type === 'LevelBarMeter' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                          <rect 
                            x="4" 
                            y={4 + (el.height - 8) * (1 - Math.min(1, Math.max(0, liveVal / 100)))} 
                            width={el.width - 8} 
                            height={(el.height - 8) * Math.min(1, Math.max(0, liveVal / 100))} 
                            rx="2" 
                            fill="url(#waterGrad)" 
                          />
                          <line x1="2" y1={el.height * 0.15} x2="10" y2={el.height * 0.15} stroke="#f43f5e" strokeWidth="2" />
                          <line x1="2" y1={el.height * 0.85} x2="10" y2={el.height * 0.85} stroke="#f43f5e" strokeWidth="2" />
                          <text x={el.width / 2} y={el.height / 2} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                            {Number(liveVal).toFixed(0)}%
                          </text>
                          <text x={el.width / 2} y={el.height + 12} textAnchor="middle" fill="#94a3b8" fontSize="8">{el.label}</text>
                        </g>
                      )}

                      {/* 32. ToggleSwitch */}
                      {el.type === 'ToggleSwitch' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height="24" rx="12" fill={pumpRunning ? '#059669' : '#334155'} stroke="#ffffff" strokeWidth="1" />
                          <circle cx={pumpRunning ? el.width - 12 : 12} cy="12" r="9" fill="#ffffff" />
                          <text x={el.width / 2} y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">{el.label}</text>
                        </g>
                      )}

                      {/* 33. PushButton */}
                      {el.type === 'PushButton' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="8" fill="#1e293b" stroke="#0284c7" strokeWidth="2" />
                          <circle cx={el.width / 2} cy={el.height / 2} r="14" fill="#0284c7" />
                          <text x={el.width / 2} y={el.height / 2 + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">START</text>
                        </g>
                      )}

                      {/* 34. EmergencyStop Button */}
                      {el.type === 'EmergencyStop' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="6" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
                          <circle cx={el.width / 2} cy={el.height / 2} r="16" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                          <text x={el.width / 2} y={el.height / 2 + 3} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">STOP</text>
                        </g>
                      )}

                      {/* 35. FunctionBlockWidget */}
                      {el.type === 'FunctionBlockWidget' && (
                        <g>
                          <rect x="0" y="0" width={el.width} height={el.height} rx="6" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
                          <text x="6" y="13" fill="#818cf8" fontSize="9" fontWeight="bold">{el.label}</text>
                          <text x="6" y="28" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
                            {Number(liveVal).toFixed(2)} {el.units}
                          </text>
                          <text x="6" y="41" fill="#94a3b8" fontSize="8" fontFamily="monospace">{el.mapped_tag}</text>
                        </g>
                      )}

                      {/* Tag Mapping Shortcut Button in Engineering Mode */}
                      {mode === 'engineering' && (
                        <g 
                          transform={`translate(${Number(el.width) + 2}, -6)`} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTagMapping(el);
                          }}
                          className="hover:scale-125 transition-transform cursor-pointer"
                        >
                          <circle cx="6" cy="6" r="6.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1" />
                          <text x="6" y="8.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">M</text>
                        </g>
                      )}
                    </g>
                  );
                })}

              </svg>
            </div>
          </div>
        )}
      </div>

        {/* ------------------------------------------------------------------ */}
        {/* C. PROPERTIES & POSITIONING INSPECTOR (Right Collapsible Panel)     */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'engineering' && isInspectorOpen && (
          <div className="w-72 md:w-80 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl overflow-hidden">
            {/* Inspector Header */}
            <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Element Inspector
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    {selectedElement ? `${selectedElement.label || selectedElement.type}` : `${localElements.length} elements on canvas`}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsInspectorOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition flex-shrink-0"
                title="Collapse Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Element Selector Dropdown */}
            <div className="p-2.5 bg-slate-950/40 border-b border-slate-800/80">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Select Canvas Element:
              </label>
              <select
                value={selectedElementId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedElementId(val || null);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">-- Choose Element ({localElements.length}) --</option>
                {localElements.map(el => (
                  <option key={el.id} value={el.id}>
                    {el.label || el.type} ({el.type}) [X:{el.x}, Y:{el.y}]
                  </option>
                ))}
              </select>
            </div>

            {selectedLine ? (
              /* Active Pipe Line Edit View */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      Pipe Line Inspector
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedLine.id}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteLine(selectedLine.id)}
                    className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60 hover:bg-rose-900 transition"
                    title="Delete this pipe line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Line Name */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Pipe Label / Tag</label>
                  <input 
                    type="text"
                    value={selectedLine.name}
                    onChange={(e) => handleUpdateLine(selectedLine.id, { name: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                {/* Fluid Preset & Color */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Fluid Type & Color</label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    {[
                      { label: 'Crude Oil', color: '#f59e0b' },
                      { label: 'Naphtha / Gas', color: '#38bdf8' },
                      { label: 'Heavy Residue', color: '#92400e' },
                      { label: 'Steam', color: '#e2e8f0' },
                      { label: 'Cooling Water', color: '#10b981' },
                      { label: 'Sour Gas', color: '#a855f7' }
                    ].map(fl => (
                      <button
                        key={fl.label}
                        onClick={() => handleUpdateLine(selectedLine.id, { color: fl.color, flowType: fl.label.toLowerCase() })}
                        className={`p-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1.5 border transition ${
                          selectedLine.color === fl.color ? 'border-cyan-400 bg-slate-800 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fl.color }} />
                        <span className="truncate">{fl.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Path Coordinates Editor */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">SVG Path Coordinates (d)</label>
                    <span className="text-[10px] text-cyan-400 font-mono">M X Y L X Y ...</span>
                  </div>
                  <input 
                    type="text"
                    value={selectedLine.path}
                    onChange={(e) => handleUpdateLine(selectedLine.id, { path: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-cyan-300"
                  />
                  {/* Quick Routing Presets */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <button
                      onClick={() => handleUpdateLine(selectedLine.id, { path: 'M 100 250 L 450 250' })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      Straight
                    </button>
                    <button
                      onClick={() => handleUpdateLine(selectedLine.id, { path: 'M 150 440 L 410 440 L 410 330 L 480 330' })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      Pump-to-Column
                    </button>
                    <button
                      onClick={() => handleUpdateLine(selectedLine.id, { path: 'M 525 80 L 525 50 L 710 50 L 710 120' })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      Overhead-to-Drum
                    </button>
                    <button
                      onClick={() => handleUpdateLine(selectedLine.id, { path: 'M 200 150 L 400 150 L 400 300 L 600 300' })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      Z-Connector
                    </button>
                  </div>
                </div>

                {/* Thickness & Animation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Width: {selectedLine.width}px</label>
                    <input 
                      type="range"
                      min="2"
                      max="14"
                      value={selectedLine.width}
                      onChange={(e) => handleUpdateLine(selectedLine.id, { width: Number(e.target.value) })}
                      className="w-full mt-1 accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Flow Animation</label>
                    <button
                      onClick={() => handleUpdateLine(selectedLine.id, { animated: !selectedLine.animated })}
                      className={`w-full mt-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                        selectedLine.animated ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>{selectedLine.animated ? 'Active Flow' : 'Static'}</span>
                    </button>
                  </div>
                </div>

                {/* Bound Tag */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Bound Flow Tag</label>
                  <select
                    value={selectedLine.tag || ''}
                    onChange={(e) => handleUpdateLine(selectedLine.id, { tag: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-cyan-300 font-mono"
                  >
                    <option value="">-- None (Continuous Flow) --</option>
                    {availableTags.map(t => (
                      <option key={t.tag_name} value={t.tag_name}>
                        {t.tag_name} ({t.display_name})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setSelectedLineId(null)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Deselect Pipe Line
                </button>
              </div>
            ) : selectedElement ? (
              /* Active Element Edit View */
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* Inspector Tabs */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-semibold">
                  <button
                    onClick={() => setInspectorTab('attributes')}
                    className={`flex-1 py-1 rounded transition text-center ${
                      inspectorTab === 'attributes'
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Attributes
                  </button>
                  <button
                    onClick={() => setInspectorTab('binding')}
                    className={`flex-1 py-1 rounded transition text-center ${
                      inspectorTab === 'binding'
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    DM Tag
                  </button>
                  <button
                    onClick={() => setInspectorTab('simulation')}
                    className={`flex-1 py-1 rounded transition text-center ${
                      inspectorTab === 'simulation'
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Live Test
                  </button>
                </div>

                {/* TAB 1: ATTRIBUTES & GEOMETRY */}
                {inspectorTab === 'attributes' && (
                  <div className="space-y-3">
                    {/* Identity */}
                    <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identity & Type</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 text-[10px] border border-cyan-500/20">
                          {selectedElement.type}
                        </span>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 font-medium">Display Label</label>
                        <input
                          type="text"
                          value={selectedElement.label || ''}
                          onChange={(e) => handleInspectorChange('label', e.target.value)}
                          onBlur={(e) => handleInspectorBlur('label', e.target.value)}
                          placeholder="e.g. TK-101, FEED PUMP"
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Coordinates & Dimensions */}
                    <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Position & Size (px)</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSnapSelectedToGrid}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
                            title="Snap to 20px grid"
                          >
                            Snap Grid
                          </button>
                          <button
                            onClick={handleCenterElement}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
                            title="Center on Canvas"
                          >
                            Center
                          </button>
                          <button
                            onClick={handleAlignToMachineryRow}
                            className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold underline"
                            title="Align to Center Machinery Row (Y: 380)"
                          >
                            Row Y:380
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400">X Position</label>
                          <input
                            type="number"
                            value={selectedElement.x ?? 0}
                            onChange={(e) => handleInspectorChange('x', e.target.value === '' ? 0 : Number(e.target.value))}
                            onBlur={(e) => handleInspectorBlur('x', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Y Position</label>
                          <input
                            type="number"
                            value={selectedElement.y ?? 0}
                            onChange={(e) => handleInspectorChange('y', e.target.value === '' ? 0 : Number(e.target.value))}
                            onBlur={(e) => handleInspectorBlur('y', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Width (W)</label>
                          <input
                            type="number"
                            value={selectedElement.width ?? 50}
                            onChange={(e) => handleInspectorChange('width', e.target.value === '' ? 20 : Number(e.target.value))}
                            onBlur={(e) => handleInspectorBlur('width', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Height (H)</label>
                          <input
                            type="number"
                            value={selectedElement.height ?? 50}
                            onChange={(e) => handleInspectorChange('height', e.target.value === '' ? 20 : Number(e.target.value))}
                            onBlur={(e) => handleInspectorBlur('height', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Rotation Controls */}
                      <div className="pt-2 border-t border-slate-800">
                        <label className="text-[10px] text-slate-400 block mb-1">Rotation Angle</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[0, 90, 180, 270].map(deg => {
                            const active = (Number(selectedElement.rotation) || 0) === deg;
                            return (
                              <button
                                key={deg}
                                onClick={() => handleRotateElement(deg)}
                                className={`py-1 rounded text-[11px] font-mono font-bold transition border ${
                                  active 
                                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm' 
                                    : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:bg-slate-800'
                                }`}
                              >
                                {deg}°
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* D-Pad Nudge System */}
                      <div className="pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                          <span>Nudge Step:</span>
                          <div className="flex gap-1">
                            {[1, 5, 10, 50].map(s => (
                              <button
                                key={s}
                                onClick={() => setNudgeStep(s)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  nudgeStep === s ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {s}px
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
                          <div></div>
                          <button
                            onClick={() => handleNudge(0, -nudgeStep)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex justify-center active:scale-95 transition"
                            title="Nudge Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <div></div>
                          <button
                            onClick={() => handleNudge(-nudgeStep, 0)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex justify-center active:scale-95 transition"
                            title="Nudge Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCenterElement}
                            className="p-1.5 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40 rounded flex justify-center active:scale-95 transition"
                            title="Center on Canvas"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleNudge(nudgeStep, 0)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex justify-center active:scale-95 transition"
                            title="Nudge Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <div></div>
                          <button
                            onClick={() => handleNudge(0, nudgeStep)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex justify-center active:scale-95 transition"
                            title="Nudge Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <div></div>
                        </div>
                      </div>
                    </div>

                    {/* Layering & Quick Operations */}
                    <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Actions & Ordering</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={handleBringToFront}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
                          title="Bring to Front"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>To Front</span>
                        </button>
                        <button
                          onClick={handleSendToBack}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
                          title="Send to Back"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>To Back</span>
                        </button>
                        <button
                          onClick={handleDuplicateElement}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
                          title="Duplicate Element (Ctrl+D)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => {
                            deleteScadaElement(activeWindow.id, selectedElement.id);
                            setLocalElements(prev => prev.filter(el => el.id !== selectedElement.id));
                            setSelectedElementId(null);
                            showToast?.('Element deleted from window', 'info');
                          }}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg font-medium transition"
                          title="Delete Element (Del)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DM TAG BINDING */}
                {inspectorTab === 'binding' && (
                  <div className="space-y-3">
                    <div className="space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bound DM Plant Tag</span>
                        <button
                          onClick={() => handleOpenTagMapping(selectedElement)}
                          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3" />
                          <span>Mapping Studio</span>
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-300 font-medium">Select Telemetry Tag</label>
                        <select
                          value={selectedElement.mapped_tag || ''}
                          onChange={(e) => handleInspectorChange('mapped_tag', e.target.value)}
                          className="w-full mt-1 bg-slate-900 border border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="">-- None (Static Element) --</option>
                          {availableTags.map(t => (
                            <option key={t.tag_name} value={t.tag_name}>
                              {t.tag_name} ({t.display_name}) [{t.source}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-300 font-medium">Target Animated Property</label>
                        <select
                          value={selectedElement.bound_property || 'value'}
                          onChange={(e) => handleInspectorChange('bound_property', e.target.value)}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="value">Primary Value (Digital Display)</option>
                          <option value="fill_level">Liquid Fill Level % (0 - 100%)</option>
                          <option value="running">Machinery Run / Spin State (Boolean)</option>
                          <option value="opening_pct">Control Valve Position % (0 - 100%)</option>
                          <option value="temperature">Process Temperature (°C)</option>
                          <option value="pressure">Pressure Reading (kPa)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-300 font-medium">Engineering Units</label>
                        <input
                          type="text"
                          value={selectedElement.units || ''}
                          onChange={(e) => handleInspectorChange('units', e.target.value)}
                          onBlur={(e) => handleInspectorBlur('units', e.target.value)}
                          placeholder="e.g. °C, %, m³/h, kPa, bar, RPM"
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: LIVE TEST & SIMULATION */}
                {inspectorTab === 'simulation' && (
                  <div className="space-y-3">
                    <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Live Simulation
                        </span>
                        <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 bg-cyan-950/80 rounded border border-cyan-500/30">
                          {telemetry[selectedElement.mapped_tag]?.value?.toFixed(1) ?? (selectedElement.value || 0)} {selectedElement.units}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Drag the slider to test dynamic SVG animations (tank fill level, pump spin, needle rotation, badge colors) in real time:
                      </p>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={telemetry[selectedElement.mapped_tag]?.value ?? (selectedElement.value || 50)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (selectedElement.mapped_tag) {
                            setTelemetry(prev => ({
                              ...prev,
                              [selectedElement.mapped_tag]: {
                                ...(prev[selectedElement.mapped_tag] || {}),
                                value: val
                              }
                            }));
                          }
                          handleInspectorChange('value', val);
                        }}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />

                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>0 {selectedElement.units}</span>
                        <span>50 {selectedElement.units}</span>
                        <span>100 {selectedElement.units}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* Empty State when no element is currently selected */
              <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start text-center space-y-4">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-cyan-400/80 mt-4">
                  <MousePointer className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">No Element Selected</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                    Click any element on the canvas to inspect its coordinates and tag binding, or select from the list below:
                  </p>
                </div>

                {/* Interactive Clickable List of All Elements */}
                <div className="w-full space-y-1.5 text-left pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Elements in this Window ({localElements.length})
                  </span>
                  {localElements.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 italic">
                      No elements placed yet. Drag from the left palette to add!
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {localElements.map(el => (
                        <div
                          key={el.id}
                          onClick={() => {
                            setSelectedElementId(el.id);
                            setIsInspectorOpen(true);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-850 cursor-pointer transition text-xs group"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-200 group-hover:text-cyan-300 block truncate">
                              {el.label || el.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block truncate">
                              {el.type} • ({el.x}, {el.y})
                            </span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 font-mono border border-cyan-500/20 flex-shrink-0">
                            {el.mapped_tag || 'Unmapped'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ==================================================================== */}
      {/* 3. SCADA BOTTOM STATUS & SAVE BAR (Fully Responsive Layout)           */}
      {/* ==================================================================== */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 z-30">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Selected:</span>
            <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              {selectedElement ? `${selectedElement.label} (${selectedElement.type}) [X:${selectedElement.x}, Y:${selectedElement.y}]` : 'None (Click canvas element)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Total:</span>
            <span className="font-mono text-white font-bold px-1.5 py-0.5 rounded bg-slate-800">{localElements.length}</span>
          </div>
          {mode === 'engineering' && (
            <div className="text-[11px] text-slate-500 hidden lg:block">
              Click element to select • Drag with mouse • Arrow keys to nudge • Ctrl+D to duplicate
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedElement && (
            <>
              <button
                onClick={() => handleOpenTagMapping(selectedElement)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Map DM Tag</span>
              </button>
              <button
                onClick={handleDuplicateElement}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition"
                title="Duplicate Element (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              if (activeWindow) {
                updateScadaWindow(activeWindow.id, {
                  ...activeWindow,
                  elements: localElements
                });
                showToast?.('SCADA window layout saved to PostgreSQL', 'success');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-600/30 transition text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Window Layout</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. DM TAG MAPPING STUDIO MODAL                                       */}
      {/* ==================================================================== */}
      {isTagMappingModalOpen && mappingElement && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border-b border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">DM Tag Mapping Studio</h3>
                  <p className="text-xs text-slate-400">
                    Bind plant telemetry, Function Blocks, or DCS tags to <b className="text-cyan-300">{mappingElement.label}</b>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsTagMappingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Target Property & Tag Selector Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Element Target Property
                  </label>
                  <select
                    value={mappingElement.temp_property}
                    onChange={(e) => setMappingElement({ ...mappingElement, temp_property: e.target.value })}
                    className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:border-cyan-500"
                  >
                    <option value="value">Primary Value (Digital Display)</option>
                    <option value="fill_level">Liquid Fill Level % (0 - 100%)</option>
                    <option value="running">Machinery Run / Stop State (Bool)</option>
                    <option value="opening_pct">Control Valve Position %</option>
                    <option value="temperature">Process Temperature (°C)</option>
                    <option value="pressure">Pressure Reading (kPa)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Currently Selected DM Tag
                  </label>
                  <input
                    type="text"
                    value={mappingElement.temp_tag}
                    onChange={(e) => setMappingElement({ ...mappingElement, temp_tag: e.target.value })}
                    placeholder="e.g. FIC_101.PV"
                    className="w-full mt-1.5 bg-slate-950 border border-cyan-500/50 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-400 font-bold"
                  />
                </div>
              </div>

              {/* Tag Search & Filter Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Available DM Tags ({filteredTagsForMapping.length})
                  </span>
                  
                  {/* Source Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                    {['ALL', 'CENTUM_VP', 'FUNCTION_BLOCK', 'DM_ASSET'].map(src => (
                      <button
                        key={src}
                        onClick={() => setTagSourceFilter(src)}
                        className={`px-2 py-0.5 rounded transition ${
                          tagSourceFilter === src 
                            ? 'bg-cyan-600 text-white font-bold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {src === 'ALL' ? 'All Sources' : src}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="Search by tag name, description, or engineering units..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-cyan-500"
                  />
                </div>

                {/* Tags Table */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                      <tr>
                        <th className="p-2.5">Tag Name</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5">Units</th>
                        <th className="p-2.5">Current Value</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredTagsForMapping.map(t => {
                        const isChosen = mappingElement.temp_tag === t.tag_name;
                        return (
                          <tr 
                            key={t.tag_name}
                            onClick={() => setMappingElement({ ...mappingElement, temp_tag: t.tag_name, temp_units: t.eng_units })}
                            className={`hover:bg-slate-800/40 cursor-pointer transition ${
                              isChosen ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                            }`}
                          >
                            <td className="p-2.5 font-mono font-bold text-cyan-300">{t.tag_name}</td>
                            <td className="p-2.5 text-slate-400">{t.display_name}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                                {t.source}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-400">{t.eng_units || '--'}</td>
                            <td className="p-2.5 font-mono text-emerald-400 font-bold">{t.current_value}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMappingElement({ ...mappingElement, temp_tag: t.tag_name, temp_units: t.eng_units });
                                }}
                                className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                                  isChosen 
                                    ? 'bg-cyan-600 text-white' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {isChosen ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Test Slider */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Live Simulation & Preview:
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {simulatedTestValue !== null ? simulatedTestValue : (telemetry[mappingElement.temp_tag]?.value || 0)} {mappingElement.temp_units}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulatedTestValue !== null ? simulatedTestValue : (telemetry[mappingElement.temp_tag]?.value || 50)}
                  onChange={(e) => setSimulatedTestValue(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950">
              <button
                onClick={() => setIsTagMappingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTagMapping}
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/30 transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Commit Tag Mapping
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. CREATE WINDOW MODAL                                               */}
      {/* ==================================================================== */}
      {isCreateWindowModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-indigo-500/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                Create New SCADA Window
              </h3>
              <button onClick={() => setIsCreateWindowModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWindowSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Window Title *</label>
                <input
                  type="text"
                  required
                  value={newWindowForm.title}
                  onChange={(e) => setNewWindowForm({ ...newWindowForm, title: e.target.value })}
                  placeholder="e.g. Vacuum Distillation VDU-201"
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Target Asset</label>
                <select
                  value={newWindowForm.asset_id}
                  onChange={(e) => setNewWindowForm({ ...newWindowForm, asset_id: e.target.value })}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                >
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Description</label>
                <input
                  type="text"
                  value={newWindowForm.description}
                  onChange={(e) => setNewWindowForm({ ...newWindowForm, description: e.target.value })}
                  placeholder="Process unit synoptic overview..."
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateWindowModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30"
                >
                  Create Window
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. CENTUM VP PID FACEPLATE MODAL                                     */}
      {/* ==================================================================== */}
      {selectedTagForFaceplate && telemetry[selectedTagForFaceplate] && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedTagForFaceplate}</h3>
                  <p className="text-xs text-slate-400">{telemetry[selectedTagForFaceplate].name || 'Process Loop'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTagForFaceplate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['AUT', 'MAN', 'CAS'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setFaceplateForm({ ...faceplateForm, mode: m })}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      faceplateForm.mode === m
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-around">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">PV</span>
                  <span className="text-sm font-mono font-bold text-cyan-300">
                    {telemetry[selectedTagForFaceplate].value?.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-500">{telemetry[selectedTagForFaceplate].units}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">SP</span>
                  <span className="text-sm font-mono font-bold text-emerald-300">
                    {Number(faceplateForm.sp).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-500">Target</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">MV</span>
                  <span className="text-sm font-mono font-bold text-amber-300">
                    {Number(faceplateForm.mv).toFixed(1)} %
                  </span>
                  <span className="text-[10px] text-slate-500">Output</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tuning Setpoint (SP):</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFaceplateForm(f => ({ ...f, sp: Number((Number(f.sp) - 1).toFixed(1)) }))}
                    className="px-3 py-1.5 bg-slate-800 text-xs rounded-lg"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    value={faceplateForm.sp}
                    onChange={(e) => setFaceplateForm({ ...faceplateForm, sp: Number(e.target.value) })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-center font-mono text-sm text-white"
                  />
                  <button
                    onClick={() => setFaceplateForm(f => ({ ...f, sp: Number((Number(f.sp) + 1).toFixed(1)) }))}
                    className="px-3 py-1.5 bg-slate-800 text-xs rounded-lg"
                  >
                    +1
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedTagForFaceplate(null)}
                  className="px-4 py-1.5 text-xs text-slate-400 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFaceplateApply}
                  className="px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow"
                >
                  Apply SP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
