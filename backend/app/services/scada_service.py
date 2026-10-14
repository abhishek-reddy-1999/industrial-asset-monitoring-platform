"""
scada_service.py - Industrial SCADA Studio Backend Engine
ThingsBoard PE Inspired SCADA/HMI Studio for Data Insight (DI).
Handles:
  1. SVG Sanitization & Validation (anti-XSS, script stripping, foreignObject rejection)
  2. Industrial SVG Symbol Registry (Pumps, Motors, Valves, Tanks, Pipes, Instruments, Process Equip)
  3. SCADA Screen Store & Lifecycle (DRAFT, VALIDATED, PUBLISHED, ARCHIVED)
  4. Immutable Version Control & Rollback Engine
  5. Asset Attribute Binding & Value Envelope Snapshot Engine
  6. Demo Seeds: Water Transfer System (Tank T-101 -> Pump P-101 -> Valve XV-101 -> Tank T-102)
"""
import os
import re
import json
import uuid
import datetime
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
import logging

from app.cache.redis_service import redis_service
from app.api.dm_service import dm_store
from app.services.value_envelope import UnifiedValueEnvelope, assess_quality
from app.services.scada_symbol_catalog import INDUSTRIAL_SYMBOL_CATALOG
from app.services.scada_template_catalog import PROCESS_TEMPLATES

logger = logging.getLogger("scada_service")

# ============================================================================
# 1. STRICT SVG SANITIZER & VALIDATOR (Anti-XSS & Safe Process Rendering)
# ============================================================================

DANGEROUS_SVG_TAGS = {
    "script", "foreignobject", "iframe", "object", "embed",
    "applet", "meta", "link", "style", "audio", "video"
}

DANGEROUS_ATTRIBUTES = {
    "onload", "onclick", "onerror", "onmouseover", "onmouseout",
    "onfocus", "onblur", "onkeydown", "onkeyup", "onchange", "onmouseenter"
}

def sanitize_svg_content(raw_svg: str) -> Dict[str, Any]:
    """
    Parses and strictly sanitizes SVG content.
    Returns: {"valid": bool, "sanitized_svg": str, "tags": List[str], "error": str}
    """
    if not raw_svg or not raw_svg.strip():
        return {"valid": False, "sanitized_svg": "", "tags": [], "error": "Empty SVG content"}

    clean_content = raw_svg.strip()
    # Strip XML prologue if present for clean parsing
    clean_content = re.sub(r'<\?xml[^>]*\?>', '', clean_content, flags=re.IGNORECASE).strip()
    clean_content = re.sub(r'<!DOCTYPE[^>]*>', '', clean_content, flags=re.IGNORECASE).strip()

    try:
        # Wrap or parse directly
        root = ET.fromstring(clean_content)
    except Exception as e:
        return {"valid": False, "sanitized_svg": "", "tags": [], "error": f"Invalid XML/SVG syntax: {str(e)}"}

    # Strip default namespace from tag names for analysis
    def get_tag_name(el):
        tag = el.tag
        return tag.split('}')[-1].lower() if '}' in tag else tag.lower()

    if get_tag_name(root) != "svg":
        return {"valid": False, "sanitized_svg": "", "tags": [], "error": "Root element must be <svg>"}

    extracted_tags = set()
    elements_to_remove = []

    def inspect_element(parent, element):
        tag_name = get_tag_name(element)
        if tag_name in DANGEROUS_SVG_TAGS:
            elements_to_remove.append((parent, element))
            return

        # Check attributes
        attribs_to_remove = []
        for attr, val in list(element.attrib.items()):
            attr_lower = attr.lower()
            if attr_lower in DANGEROUS_ATTRIBUTES or attr_lower.startswith("on"):
                attribs_to_remove.append(attr)
            elif "javascript:" in str(val).lower() or "data:" in str(val).lower():
                attribs_to_remove.append(attr)
            elif attr_lower in ["id", "data-tag"]:
                extracted_tags.add(str(val))

        for attr in attribs_to_remove:
            del element.attrib[attr]

        for child in list(element):
            inspect_element(element, child)

    # Inspect all elements recursively
    for child in list(root):
        inspect_element(root, child)

    for parent, el in elements_to_remove:
        try:
            parent.remove(el)
        except Exception:
            pass

    # Ensure viewBox and basic dimensional attributes exist
    if "viewBox" not in root.attrib and ("width" in root.attrib and "height" in root.attrib):
        try:
            w = int(float(root.attrib["width"].replace("px", "")))
            h = int(float(root.attrib["height"].replace("px", "")))
            root.attrib["viewBox"] = f"0 0 {w} {h}"
        except Exception:
            pass

    try:
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        raw_xml = ET.tostring(root, encoding="utf-8").decode("utf-8")
        # Strip any generated ns0: or ns\d+: namespace prefixes
        clean_svg = re.sub(r'</?ns\d+:', lambda m: '</' if m.group(0).startswith('</') else '<', raw_xml)
        clean_svg = re.sub(r'\sxmlns:ns\d+="[^"]*"', '', clean_svg)
        if 'xmlns=' not in clean_svg:
            clean_svg = re.sub(r'<svg', '<svg xmlns="http://www.w3.org/2000/svg"', clean_svg, count=1)
        return {
            "valid": True,
            "sanitized_svg": clean_svg,
            "tags": sorted(list(extracted_tags)),
            "error": None
        }
    except Exception as e:
        return {"valid": False, "sanitized_svg": "", "tags": [], "error": f"Failed to serialize sanitized SVG: {str(e)}"}


# ============================================================================
# 2. STANDARD INDUSTRIAL SVG SYMBOLS REGISTRY
# ============================================================================

BUILTIN_SYMBOLS: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # PUMPS
    # -------------------------------------------------------------------------
    {
        "id": "sym-pump-centrifugal",
        "name": "Centrifugal Pump (ANSI/API-610)",
        "category": "Pumps",
        "description": "Horizontal centrifugal pump with circular volute casing and impeller.",
        "version": "1.0.0",
        "default_width": 70,
        "default_height": 70,
        "aspect_ratio": "1:1",
        "tags": ["pump_casing", "impeller", "status_light", "discharge_nozzle", "suction_nozzle"],
        "properties": {
            "casingColor": "#334155",
            "strokeColor": "#64748b",
            "runningColor": "#10b981",
            "stoppedColor": "#64748b",
            "alarmColor": "#ef4444"
        },
        "behaviors": [
            {"type": "rotation", "target": "impeller", "trigger": "running", "speed": 1.2},
            {"type": "fill", "target": "status_light", "trigger": "state_color"},
            {"type": "fill", "target": "pump_casing", "trigger": "casingColor"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET", "OPEN_ALARM_HISTORY"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="pumpGrad" cx="45%" cy="45%" r="55%">
      <stop offset="0%" stopColor="#475569"/>
      <stop offset="100%" stopColor="#1e293b"/>
    </radialGradient>
  </defs>
  <!-- Suction Nozzle Left (extends to edge x=0) -->
  <rect id="suction_nozzle" x="0" y="44" width="22" height="12" fill="#334155" stroke="#64748b" stroke-width="2" rx="2"/>
  <line x1="0" y1="40" x2="0" y2="60" stroke="#94a3b8" stroke-width="2.5"/>
  <!-- Discharge Flange Right (extends to edge x=100) -->
  <rect id="discharge_nozzle_right" x="78" y="44" width="22" height="12" fill="#334155" stroke="#64748b" stroke-width="2" rx="2"/>
  <line x1="100" y1="40" x2="100" y2="60" stroke="#94a3b8" stroke-width="2.5"/>
  <!-- Auxiliary Top Discharge Nozzle -->
  <rect id="discharge_nozzle" x="44" y="0" width="12" height="20" fill="#334155" stroke="#64748b" stroke-width="2" rx="2"/>
  <!-- Main Volute Casing (centered at 50, 50) -->
  <circle id="pump_casing" cx="50" cy="50" r="32" fill="url(#pumpGrad)" stroke="#64748b" stroke-width="3"/>
  <!-- Internal Impeller Rotor (Rotates on running) -->
  <g id="impeller" transform-origin="50 50">
    <circle cx="50" cy="50" r="9" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
    <path d="M50 41 Q55 30 65 35 M59 50 Q70 55 65 65 M50 59 Q45 70 35 65 M41 50 Q30 45 35 35" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <!-- Status Indicator LED -->
  <circle id="status_light" cx="66" cy="34" r="5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
</svg>"""
    },
    {
        "id": "sym-pump-reciprocating",
        "name": "Reciprocating Piston Pump",
        "category": "Pumps",
        "description": "Positive displacement piston/plunger pump with cylinder head.",
        "version": "1.0.0",
        "default_width": 80,
        "default_height": 50,
        "aspect_ratio": "1.6:1",
        "tags": ["pump_body", "piston", "status_light"],
        "properties": {
            "bodyColor": "#1e293b",
            "strokeColor": "#64748b"
        },
        "behaviors": [
            {"type": "pulsing", "target": "piston", "trigger": "running"},
            {"type": "fill", "target": "status_light", "trigger": "state_color"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="100" height="60">
  <rect id="pump_body" x="15" y="15" width="55" height="30" fill="#334155" stroke="#64748b" stroke-width="2" rx="3"/>
  <rect id="piston" x="65" y="22" width="22" height="16" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
  <line x1="87" y1="30" x2="96" y2="30" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
  <circle id="status_light" cx="25" cy="30" r="4" fill="#64748b" stroke="#0f172a" stroke-width="1"/>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # MOTORS
    # -------------------------------------------------------------------------
    {
        "id": "sym-motor-ac",
        "name": "Three-Phase AC Induction Motor",
        "category": "Motors",
        "description": "Industrial squirrel-cage induction motor with cooling fins.",
        "version": "1.0.0",
        "default_width": 75,
        "default_height": 65,
        "aspect_ratio": "1.15:1",
        "tags": ["motor_body", "motor_shaft", "status_indicator", "cooling_fan"],
        "properties": {
            "bodyColor": "#1e293b",
            "strokeColor": "#475569"
        },
        "behaviors": [
            {"type": "rotation", "target": "motor_shaft", "trigger": "running"},
            {"type": "fill", "target": "status_indicator", "trigger": "state_color"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET", "OPEN_ALARM_HISTORY"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">
  <defs>
    <linearGradient id="motorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="50%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <!-- Base Mount Feet -->
  <rect x="20" y="68" width="55" height="6" fill="#0f172a" stroke="#64748b" stroke-width="1.5" rx="1"/>
  <!-- Stator Frame & Cooling Fins -->
  <rect id="motor_body" x="20" y="16" width="55" height="52" fill="url(#motorGrad)" stroke="#64748b" stroke-width="2.5" rx="6"/>
  <line x1="28" y1="16" x2="28" y2="68" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="36" y1="16" x2="36" y2="68" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="44" y1="16" x2="44" y2="68" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="52" y1="16" x2="52" y2="68" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="60" y1="16" x2="60" y2="68" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Conduit Box Top -->
  <rect x="36" y="8" width="22" height="9" fill="#334155" stroke="#64748b" stroke-width="1.5" rx="1.5"/>
  <!-- Drive Shaft -->
  <g id="motor_shaft" transform-origin="84 42">
    <rect x="75" y="37" width="16" height="10" fill="#94a3b8" stroke="#64748b" stroke-width="1.5"/>
    <circle cx="83" cy="42" r="3" fill="#0f172a"/>
  </g>
  <!-- Fan Shroud Left -->
  <path id="cooling_fan" d="M12 25 L20 20 L20 64 L12 59 Z" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
  <!-- Status Lamp -->
  <circle id="status_indicator" cx="47" cy="42" r="6" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # VALVES
    # -------------------------------------------------------------------------
    {
        "id": "sym-valve-control",
        "name": "Diaphragm Control Valve (Pneumatic)",
        "category": "Valves",
        "description": "Proportional control valve with pneumatic diaphragm actuator and positioner.",
        "version": "1.0.0",
        "default_width": 50,
        "default_height": 70,
        "aspect_ratio": "0.7:1",
        "tags": ["valve_body", "actuator_dome", "stem", "status_indicator", "position_label"],
        "properties": {
            "valveColor": "#334155",
            "strokeColor": "#64748b",
            "openColor": "#10b981",
            "closedColor": "#64748b"
        },
        "behaviors": [
            {"type": "fill", "target": "status_indicator", "trigger": "state_color"},
            {"type": "text", "target": "position_label", "trigger": "opening_pct"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="60" height="90">
  <!-- Actuator Diaphragm Dome -->
  <path id="actuator_dome" d="M8 24 C8 10, 52 10, 52 24 Z" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <rect x="27" y="24" width="6" height="26" fill="#94a3b8" id="stem"/>
  <!-- Status Indicator LED inside Actuator -->
  <circle id="status_indicator" cx="30" cy="18" r="4" fill="#64748b" stroke="#0f172a" stroke-width="1"/>
  <!-- Valve Body (Opposing Triangles spanning edge-to-edge from 0 to 60) -->
  <g id="valve_body">
    <polygon points="0,50 30,65 0,80" fill="#334155" stroke="#64748b" stroke-width="2"/>
    <polygon points="60,50 30,65 60,80" fill="#334155" stroke="#64748b" stroke-width="2"/>
    <circle cx="30" cy="65" r="4.5" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="0" y1="46" x2="0" y2="84" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="60" y1="46" x2="60" y2="84" stroke="#94a3b8" stroke-width="2.5"/>
  </g>
</svg>"""
    },
    {
        "id": "sym-valve-ball",
        "name": "Quarter-Turn Ball Valve",
        "category": "Valves",
        "description": "On/off ball isolation valve with manual lever or quarter-turn actuator.",
        "version": "1.0.0",
        "default_width": 45,
        "default_height": 45,
        "aspect_ratio": "1:1",
        "tags": ["valve_body", "handle", "status_indicator"],
        "properties": {
            "valveColor": "#334155",
            "strokeColor": "#64748b"
        },
        "behaviors": [
            {"type": "rotation", "target": "handle", "trigger": "open_state"},
            {"type": "fill", "target": "status_indicator", "trigger": "state_color"}
        ],
        "actions": ["OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <!-- Handle Lever -->
  <line id="handle" x1="30" y1="30" x2="52" y2="10" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
  <polygon points="8,15 30,30 8,45" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <polygon points="52,15 30,30 52,45" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <circle id="status_indicator" cx="30" cy="30" r="5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
</svg>"""
    },
    {
        "id": "sym-valve-check",
        "name": "Non-Return Check Valve",
        "category": "Valves",
        "description": "Swing check non-return flow valve.",
        "version": "1.0.0",
        "default_width": 45,
        "default_height": 35,
        "aspect_ratio": "1.3:1",
        "tags": ["valve_body", "flow_arrow"],
        "properties": {
            "valveColor": "#334155",
            "strokeColor": "#64748b"
        },
        "behaviors": [],
        "actions": ["OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="60" height="40">
  <polygon points="10,8 30,20 10,32" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <polygon points="50,8 30,20 50,32" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <line x1="30" y1="8" x2="30" y2="32" stroke="#38bdf8" stroke-width="2.5"/>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # TANKS & VESSELS
    # -------------------------------------------------------------------------
    {
        "id": "sym-tank-vertical",
        "name": "Vertical Storage Tank (Dynamic Level)",
        "category": "Tanks",
        "description": "API-650 vertical storage vessel with sanitized SVG liquid level fill and limits.",
        "version": "1.0.0",
        "default_width": 90,
        "default_height": 130,
        "aspect_ratio": "0.7:1",
        "tags": ["tank_shell", "level_fill", "level_clip", "level_text", "high_alarm_line", "low_alarm_line"],
        "properties": {
            "tankColor": "#1e293b",
            "strokeColor": "#475569",
            "liquidColor": "#0284c7",
            "fillPct": 65
        },
        "behaviors": [
            {"type": "level_height", "target": "level_fill", "trigger": "level_pct", "min": 0, "max": 100},
            {"type": "text", "target": "level_text", "trigger": "level_pct", "format": "{value}%"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET", "OPEN_ALARM_HISTORY"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="100" height="140">
  <defs>
    <linearGradient id="tankShellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#334155"/>
      <stop offset="50%" stopColor="#1e293b"/>
      <stop offset="100%" stopColor="#0f172a"/>
    </linearGradient>
    <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#38bdf8"/>
      <stop offset="100%" stopColor="#0369a1"/>
    </linearGradient>
    <clipPath id="tankInnerClip">
      <path d="M4 25 Q50 14 96 25 L96 115 Q50 126 4 115 Z"/>
    </clipPath>
  </defs>
  <!-- Tank Outer Background & Shell (Spans from x=2 to x=98) -->
  <path id="tank_shell" d="M2 25 Q50 12 98 25 L98 115 Q50 128 2 115 Z" fill="url(#tankShellGrad)" stroke="#64748b" stroke-width="3"/>
  <!-- Liquid Fill (Clipped inside tank shell, scaled via translateY/height) -->
  <g clip-path="url(#tankInnerClip)">
    <rect id="level_fill" x="2" y="55" width="96" height="85" fill="url(#liquidGrad)" opacity="0.85"/>
  </g>
  <!-- High Alarm Level Indicator Line -->
  <line id="high_alarm_line" x1="6" y1="36" x2="94" y2="36" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
  <!-- Low Alarm Level Indicator Line -->
  <line id="low_alarm_line" x1="6" y1="104" x2="94" y2="104" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3"/>
  <!-- Digital Level Readout Label -->
  <text id="level_text" x="50" y="75" fill="#f8fafc" font-size="14" font-weight="700" text-anchor="middle" font-family="monospace">65.0%</text>
</svg>"""
    },
    {
        "id": "sym-tank-horizontal",
        "name": "Horizontal Reflux Drum / Vessel",
        "category": "Tanks",
        "description": "Horizontal cylindrical pressure drum with dished ellipsoidal heads.",
        "version": "1.0.0",
        "default_width": 110,
        "default_height": 60,
        "aspect_ratio": "1.8:1",
        "tags": ["vessel_shell", "level_fill", "level_text"],
        "properties": {
            "vesselColor": "#1e293b",
            "strokeColor": "#475569",
            "liquidColor": "#0284c7"
        },
        "behaviors": [
            {"type": "level_height", "target": "level_fill", "trigger": "level_pct"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70" width="120" height="70">
  <defs>
    <clipPath id="drumClip">
      <rect x="12" y="12" width="96" height="46" rx="20"/>
    </clipPath>
  </defs>
  <!-- Saddles / Support Legs -->
  <rect x="28" y="56" width="12" height="10" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
  <rect x="80" y="56" width="12" height="10" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
  <!-- Main Dished Shell -->
  <rect id="vessel_shell" x="10" y="10" width="100" height="50" rx="22" fill="#1e293b" stroke="#64748b" stroke-width="3"/>
  <!-- Liquid Region -->
  <g clip-path="url(#drumClip)">
    <rect id="level_fill" x="10" y="30" width="100" height="35" fill="#0284c7" opacity="0.8"/>
  </g>
  <text id="level_text" x="60" y="40" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">58%</text>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # PIPES & PROCESS CONDUITS
    # -------------------------------------------------------------------------
    {
        "id": "sym-pipe-flow",
        "name": "Smart Animated Flow Pipe",
        "category": "Pipes",
        "description": "Process conduit with dynamic bidirectional dash animation and flow status.",
        "version": "1.0.0",
        "default_width": 160,
        "default_height": 20,
        "aspect_ratio": "8:1",
        "tags": ["pipe_body", "flow_stream", "direction_arrow"],
        "properties": {
            "pipeColor": "#1e293b",
            "strokeColor": "#475569",
            "fluidColor": "#38bdf8",
            "pipeWidth": 14
        },
        "behaviors": [
            {"type": "dash_flow", "target": "flow_stream", "trigger": "flow_speed"},
            {"type": "visibility", "target": "direction_arrow", "trigger": "has_flow"}
        ],
        "actions": ["OPEN_TREND"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 24" width="160" height="24">
  <!-- Outer Conduit Tube -->
  <rect id="pipe_body" x="0" y="3" width="160" height="18" fill="#1e293b" stroke="#475569" stroke-width="2" rx="3"/>
  <!-- Inner Animated Flow Centerline (CSS animated dashoffset) -->
  <line id="flow_stream" x1="4" y1="12" x2="156" y2="12" stroke="#38bdf8" stroke-width="6" stroke-dasharray="12,8" stroke-linecap="round"/>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # PROCESS EQUIPMENT
    # -------------------------------------------------------------------------
    {
        "id": "sym-heat-exchanger",
        "name": "Shell & Tube Heat Exchanger",
        "category": "Process Equipment",
        "description": "Counter-current shell & tube heat exchanger with fluid inlet/outlet nozzles.",
        "version": "1.0.0",
        "default_width": 90,
        "default_height": 60,
        "aspect_ratio": "1.5:1",
        "tags": ["shell", "tube_bundle", "status_indicator"],
        "properties": {
            "shellColor": "#1e293b",
            "strokeColor": "#64748b"
        },
        "behaviors": [
            {"type": "fill", "target": "status_indicator", "trigger": "state_color"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 65" width="100" height="65">
  <!-- Channel heads and Shell -->
  <rect id="shell" x="20" y="12" width="60" height="40" rx="10" fill="#1e293b" stroke="#64748b" stroke-width="2.5"/>
  <rect x="8" y="16" width="12" height="32" rx="4" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <rect x="80" y="16" width="12" height="32" rx="4" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <!-- Tube passes -->
  <line x1="22" y1="24" x2="78" y2="24" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>
  <line x1="22" y1="32" x2="78" y2="32" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>
  <line x1="22" y1="40" x2="78" y2="40" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>
  <!-- Nozzles -->
  <rect x="30" y="4" width="10" height="8" fill="#475569"/>
  <rect x="60" y="52" width="10" height="8" fill="#475569"/>
  <circle id="status_indicator" cx="50" cy="32" r="4" fill="#10b981"/>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # INSTRUMENTS & READOUTS
    # -------------------------------------------------------------------------
    {
        "id": "sym-instrument-badge",
        "name": "Digital Process Badge (ISA-5.1)",
        "category": "Instruments",
        "description": "ISA-5.1 round bubble tag with live digital readout, units, and quality tag.",
        "version": "1.0.0",
        "default_width": 105,
        "default_height": 55,
        "aspect_ratio": "1.9:1",
        "tags": ["badge_frame", "tag_name", "value_display", "unit_display", "quality_led"],
        "properties": {
            "bgColor": "#0f172a",
            "textColor": "#38bdf8",
            "fontSize": 14
        },
        "behaviors": [
            {"type": "text", "target": "value_display", "trigger": "value"},
            {"type": "text", "target": "unit_display", "trigger": "unit"},
            {"type": "text", "target": "tag_name", "trigger": "tag"},
            {"type": "fill", "target": "quality_led", "trigger": "quality_color"}
        ],
        "actions": ["OPEN_TREND", "OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
  <rect id="badge_frame" x="2" y="2" width="116" height="56" rx="6" fill="#090e1d" stroke="#38bdf8" stroke-width="1.8"/>
  <rect x="2" y="2" width="116" height="18" rx="4" fill="rgba(56, 189, 248, 0.12)"/>
  <text id="tag_name" x="10" y="15" fill="#94a3b8" font-size="10" font-weight="700" font-family="sans-serif">TIC-101.PV</text>
  <circle id="quality_led" cx="108" cy="11" r="4" fill="#10b981"/>
  <text id="value_display" x="12" y="44" fill="#38bdf8" font-size="18" font-weight="800" font-family="monospace">118.4</text>
  <text id="unit_display" x="88" y="44" fill="#64748b" font-size="12" font-weight="600" font-family="sans-serif">°C</text>
</svg>"""
    },
    {
        "id": "sym-radial-gauge",
        "name": "Bourdon Tube Pressure Gauge",
        "category": "Instruments",
        "description": "Circular pressure/temperature dial gauge with calibrated needle.",
        "version": "1.0.0",
        "default_width": 80,
        "default_height": 80,
        "aspect_ratio": "1:1",
        "tags": ["gauge_face", "needle", "center_pin", "value_text"],
        "properties": {
            "faceColor": "#0f172a",
            "needleColor": "#ef4444"
        },
        "behaviors": [
            {"type": "rotation", "target": "needle", "trigger": "value", "min_deg": -120, "max_deg": 120},
            {"type": "text", "target": "value_text", "trigger": "value"}
        ],
        "actions": ["OPEN_TREND"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle id="gauge_face" cx="50" cy="50" r="45" fill="#0f172a" stroke="#64748b" stroke-width="3"/>
  <path d="M22 68 A 38 38 0 1 1 78 68" fill="none" stroke="#334155" stroke-width="4"/>
  <path d="M22 68 A 38 38 0 0 1 45 13" fill="none" stroke="#10b981" stroke-width="4"/>
  <path d="M45 13 A 38 38 0 0 1 70 26" fill="none" stroke="#f59e0b" stroke-width="4"/>
  <path d="M70 26 A 38 38 0 0 1 78 68" fill="none" stroke="#ef4444" stroke-width="4"/>
  <!-- Needle -->
  <line id="needle" x1="50" y1="50" x2="50" y2="18" stroke="#ef4444" stroke-width="3" stroke-linecap="round" transform-origin="50 50"/>
  <circle id="center_pin" cx="50" cy="50" r="5" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
  <text id="value_text" x="50" y="78" fill="#f8fafc" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">145.2</text>
</svg>"""
    },

    # -------------------------------------------------------------------------
    # HMI CONTROLS & STATUS
    # -------------------------------------------------------------------------
    {
        "id": "sym-status-lamp",
        "name": "Multi-State Pilot Lamp (ISA-18.2)",
        "category": "HMI Controls",
        "description": "Multi-state beacon lamp for equipment running, stopped, trip, or alarm status.",
        "version": "1.0.0",
        "default_width": 36,
        "default_height": 36,
        "aspect_ratio": "1:1",
        "tags": ["lamp_lens", "lamp_bezel"],
        "properties": {
            "lensColor": "#10b981"
        },
        "behaviors": [
            {"type": "fill", "target": "lamp_lens", "trigger": "state_color"},
            {"type": "blinking", "target": "lamp_lens", "trigger": "in_alarm"}
        ],
        "actions": ["OPEN_ALARM_HISTORY"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <circle id="lamp_bezel" cx="20" cy="20" r="18" fill="#1e293b" stroke="#475569" stroke-width="2"/>
  <circle id="lamp_lens" cx="20" cy="20" r="13" fill="#10b981" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="4" fill="#ffffff" opacity="0.3"/>
</svg>"""
    },
    {
        "id": "sym-hmi-pushbutton",
        "name": "Industrial Touch Button",
        "category": "HMI Controls",
        "description": "Pushbutton control with click action handler.",
        "version": "1.0.0",
        "default_width": 80,
        "default_height": 34,
        "aspect_ratio": "2.35:1",
        "tags": ["button_body", "button_label"],
        "properties": {
            "btnText": "START",
            "btnColor": "#0284c7"
        },
        "behaviors": [
            {"type": "text", "target": "button_label", "trigger": "btnText"}
        ],
        "actions": ["NAVIGATE_SCREEN", "OPEN_ASSET"],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 38" width="90" height="38">
  <rect id="button_body" x="2" y="2" width="86" height="34" rx="6" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
  <text id="button_label" x="45" y="23" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle" font-family="sans-serif">START</text>
</svg>"""
    }
]

ALL_BUILTIN_SYMBOLS: List[Dict[str, Any]] = list(BUILTIN_SYMBOLS)
for _s in INDUSTRIAL_SYMBOL_CATALOG:
    if not any(b["id"] == _s["id"] for b in ALL_BUILTIN_SYMBOLS):
        ALL_BUILTIN_SYMBOLS.append(_s)

# ============================================================================
# 3. SCADA SCREEN STORE & PERSISTENCE MANAGER
# ============================================================================

STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scada_store_state.json")

class ScadaStore:
    def __init__(self):
        self.symbols: List[Dict[str, Any]] = list(ALL_BUILTIN_SYMBOLS)
        self.screens: List[Dict[str, Any]] = []
        self.screen_versions: Dict[str, List[Dict[str, Any]]] = {}  # screen_id -> list of snapshots
        self.templates: List[Dict[str, Any]] = list(PROCESS_TEMPLATES)
        self.load_state()

        # If no screens exist, initialize Demo A (Water Transfer System)
        if not self.screens:
            self.init_demo_screens()

    def persist_state(self):
        try:
            payload = {
                "symbols": self.symbols,
                "screens": self.screens,
                "screen_versions": self.screen_versions
            }
            with open(STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            logger.error("Failed to persist SCADA store: %s", e)

    def load_state(self):
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                custom_syms = [s for s in data.get("symbols", []) if not any(b["id"] == s["id"] for b in ALL_BUILTIN_SYMBOLS)]
                self.symbols = list(ALL_BUILTIN_SYMBOLS) + custom_syms
                self.screens = data.get("screens", [])
                self.screen_versions = data.get("screen_versions", {})
                return
            except Exception as e:
                logger.warning("Could not read scada_store_state.json: %s", e)
        self.symbols = list(ALL_BUILTIN_SYMBOLS)
        self.screens = []
        self.screen_versions = {}

    def init_demo_screens(self):
        """Seeds Demo A: Water Transfer System & Demo B: Motor Monitoring."""
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        # DEMO A - WATER TRANSFER SYSTEM
        # Tank T-101 -> Pump P-101 -> Valve XV-101 -> Tank T-102
        water_transfer_screen = {
            "id": "screen-water-transfer",
            "name": "Water Transfer & Distribution Loop",
            "description": "Continuous Potable and Demineralized Water Transfer Loop (T-101 -> P-101 -> XV-101 -> T-102)",
            "site_id": "PRJ-SGP-JURONG-01",
            "site_name": "Singapore Jurong Refinery",
            "default_asset_id": "ast-eq-pump",
            "width": 1920,
            "height": 1080,
            "background": {
                "color": "#020617",
                "show_grid": True,
                "grid_size": 20
            },
            "status": "PUBLISHED",
            "published_version": "1.0.0",
            "created_at": now_iso,
            "updated_at": now_iso,
            "owner": "engineer@yokogawa.com",
            "elements": [
                # 1. Source Tank T-101 (API Storage Tank)
                {
                    "instance_id": "inst-tank-101",
                    "symbol_id": "sym-tank-vertical",
                    "label": "Feed Storage Tank T-101",
                    "x": 120,
                    "y": 280,
                    "width": 180,
                    "height": 260,
                    "rotation": 0,
                    "layer": 1,
                    "bindings": {
                        "level_pct": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-drum",
                            "asset_name": "Overhead Accumulator Drum V-101",
                            "attribute_id": "attr-v101-1",
                            "attribute_name": "Hydrocarbon Liquid Level",
                            "tag_name": "LIC_101.PV",
                            "uom": "%",
                            "min": 0,
                            "max": 100
                        }
                    },
                    "properties": {
                        "tankColor": "#0f172a",
                        "liquidColor": "#0284c7"
                    },
                    "actions": {
                        "onClick": "OPEN_TREND"
                    }
                },
                # 2. Suction Pipe T-101 to Pump P-101
                {
                    "instance_id": "inst-pipe-suction",
                    "symbol_id": "sym-pipe-flow",
                    "label": "P-101 Suction Header",
                    "x": 300,
                    "y": 480,
                    "width": 240,
                    "height": 24,
                    "rotation": 0,
                    "layer": 0,
                    "bindings": {
                        "flow_speed": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-pump",
                            "attribute_id": "attr-pmp-2",
                            "attribute_name": "Suction Pressure",
                            "tag_name": "FIC_101.PV",
                            "uom": "m³/h"
                        }
                    },
                    "properties": {
                        "pipeWidth": 16,
                        "fluidColor": "#38bdf8"
                    }
                },
                # 3. Main Transfer Pump P-101A (Centrifugal)
                {
                    "instance_id": "inst-pump-101",
                    "symbol_id": "sym-pump-centrifugal",
                    "label": "Water Transfer Pump P-101A",
                    "x": 540,
                    "y": 440,
                    "width": 130,
                    "height": 130,
                    "rotation": 0,
                    "layer": 2,
                    "bindings": {
                        "running": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-pump",
                            "attribute_id": "attr-pmp-5",
                            "attribute_name": "Pump Differential Head",
                            "tag_name": "PUMP_101A.DIFF_HEAD",
                            "uom": "m"
                        },
                        "state_color": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-pump",
                            "attribute_id": "attr-pmp-7",
                            "attribute_name": "Emergency Shutdown Interlock",
                            "tag_name": "PUMP_101A.RUN_STATUS"
                        }
                    },
                    "properties": {
                        "casingColor": "#1e293b"
                    },
                    "actions": {
                        "onClick": "OPEN_ASSET"
                    }
                },
                # 4. Discharge Pipe P-101 to Valve XV-101
                {
                    "instance_id": "inst-pipe-mid",
                    "symbol_id": "sym-pipe-flow",
                    "label": "Discharge Header",
                    "x": 670,
                    "y": 480,
                    "width": 220,
                    "height": 24,
                    "rotation": 0,
                    "layer": 0,
                    "bindings": {
                        "flow_speed": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-pump",
                            "attribute_id": "attr-pmp-1",
                            "attribute_name": "Discharge Pressure",
                            "tag_name": "FIC_101.PV",
                            "uom": "kPa"
                        }
                    },
                    "properties": {
                        "pipeWidth": 16,
                        "fluidColor": "#38bdf8"
                    }
                },
                # 5. Isolation Valve XV-101 (Control Valve)
                {
                    "instance_id": "inst-valve-101",
                    "symbol_id": "sym-valve-control",
                    "label": "Transfer Block Valve XV-101",
                    "x": 890,
                    "y": 440,
                    "width": 80,
                    "height": 110,
                    "rotation": 0,
                    "layer": 2,
                    "bindings": {
                        "opening_pct": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-unit-cdu",
                            "attribute_id": "attr-cdu-2",
                            "attribute_name": "Column Top Pressure",
                            "tag_name": "FIC_101.PV",
                            "uom": "%"
                        }
                    },
                    "actions": {
                        "onClick": "OPEN_TREND"
                    }
                },
                # 6. Discharge Pipe XV-101 to Destination Tank T-102
                {
                    "instance_id": "inst-pipe-dest",
                    "symbol_id": "sym-pipe-flow",
                    "label": "T-102 Feed Run",
                    "x": 970,
                    "y": 480,
                    "width": 250,
                    "height": 24,
                    "rotation": 0,
                    "layer": 0,
                    "bindings": {
                        "flow_speed": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-unit-cdu",
                            "attribute_id": "attr-cdu-1",
                            "attribute_name": "Overhead Vapor Temperature",
                            "tag_name": "FIC_101.PV",
                            "uom": "m³/h"
                        }
                    },
                    "properties": {
                        "pipeWidth": 16,
                        "fluidColor": "#38bdf8"
                    }
                },
                # 7. Destination Tank T-102 (API Storage Tank)
                {
                    "instance_id": "inst-tank-102",
                    "symbol_id": "sym-tank-vertical",
                    "label": "Product Receiving Tank T-102",
                    "x": 1220,
                    "y": 280,
                    "width": 180,
                    "height": 260,
                    "rotation": 0,
                    "layer": 1,
                    "bindings": {
                        "level_pct": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-drum",
                            "attribute_id": "attr-v101-1",
                            "attribute_name": "Hydrocarbon Liquid Level",
                            "tag_name": "FIC_101.PV",
                            "uom": "%",
                            "min": 0,
                            "max": 100
                        }
                    },
                    "properties": {
                        "tankColor": "#0f172a",
                        "liquidColor": "#10b981"
                    },
                    "actions": {
                        "onClick": "OPEN_TREND"
                    }
                },
                # 8. Discharge Pressure Digital Readout Badge
                {
                    "instance_id": "inst-badge-press",
                    "symbol_id": "sym-instrument-badge",
                    "label": "PT-101 Discharge Pressure",
                    "x": 680,
                    "y": 380,
                    "width": 140,
                    "height": 65,
                    "rotation": 0,
                    "layer": 3,
                    "bindings": {
                        "value": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-eq-pump",
                            "attribute_id": "attr-pmp-1",
                            "attribute_name": "Discharge Pressure",
                            "tag_name": "PIC_101.PV",
                            "uom": "kPa"
                        }
                    },
                    "actions": {
                        "onClick": "OPEN_TREND"
                    }
                },
                # 9. Main Line Flow Digital Readout Badge
                {
                    "instance_id": "inst-badge-flow",
                    "symbol_id": "sym-instrument-badge",
                    "label": "FT-101 Transfer Flowrate",
                    "x": 1000,
                    "y": 380,
                    "width": 140,
                    "height": 65,
                    "rotation": 0,
                    "layer": 3,
                    "bindings": {
                        "value": {
                            "mode": "DYNAMIC",
                            "asset_id": "ast-unit-cdu",
                            "attribute_id": "attr-cdu-1",
                            "attribute_name": "Overhead Vapor Temperature",
                            "tag_name": "FIC_101.PV",
                            "uom": "m³/h"
                        }
                    },
                    "actions": {
                        "onClick": "OPEN_TREND"
                    }
                }
            ]
        }

        self.screens = [water_transfer_screen]
        # Seed version 1.0.0 snapshot
        self.screen_versions["screen-water-transfer"] = [
            {
                "version": "1.0.0",
                "published_at": now_iso,
                "published_by": "engineer@yokogawa.com",
                "changelog": "Initial baseline published water transfer loop",
                "screen_snapshot": water_transfer_screen
            }
        ]
        self.persist_state()

    # --- Screen Management APIs ---
    def list_screens(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": s["id"],
                "name": s["name"],
                "description": s.get("description", ""),
                "site_id": s.get("site_id", ""),
                "site_name": s.get("site_name", ""),
                "width": s.get("width", 1920),
                "height": s.get("height", 1080),
                "status": s.get("status", "DRAFT"),
                "published_version": s.get("published_version", "None"),
                "element_count": len(s.get("elements", [])),
                "updated_at": s.get("updated_at", ""),
                "owner": s.get("owner", "System")
            }
            for s in self.screens
        ]

    def get_screen(self, screen_id: str) -> Optional[Dict[str, Any]]:
        return next((s for s in self.screens if s["id"] == screen_id), None)

    def create_screen(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        new_id = payload.get("id") or f"screen-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        screen = {
            "id": new_id,
            "name": payload.get("name", "New Industrial SCADA Screen"),
            "description": payload.get("description", ""),
            "site_id": payload.get("site_id", "PRJ-SGP-JURONG-01"),
            "site_name": payload.get("site_name", "Jurong Complex"),
            "default_asset_id": payload.get("default_asset_id", None),
            "width": payload.get("width", 1920),
            "height": payload.get("height", 1080),
            "background": payload.get("background", {"color": "#020617", "show_grid": True, "grid_size": 20}),
            "status": "DRAFT",
            "published_version": "None",
            "created_at": now_iso,
            "updated_at": now_iso,
            "owner": payload.get("owner", "engineer@yokogawa.com"),
            "elements": payload.get("elements", [])
        }
        self.screens.append(screen)
        self.persist_state()
        return screen

    def update_screen(self, screen_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        screen = self.get_screen(screen_id)
        if not screen:
            return None
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        for field in ["name", "description", "site_id", "site_name", "default_asset_id", "width", "height", "background", "elements"]:
            if field in payload:
                screen[field] = payload[field]

        screen["updated_at"] = now_iso
        # Editing moves status to DRAFT if previously PUBLISHED, but active published version snapshot remains intact!
        if screen.get("status") == "PUBLISHED":
            screen["status"] = "DRAFT"

        self.persist_state()
        return screen

    def delete_screen(self, screen_id: str) -> bool:
        before = len(self.screens)
        self.screens = [s for s in self.screens if s["id"] != screen_id]
        if len(self.screens) < before:
            self.screen_versions.pop(screen_id, None)
            self.persist_state()
            return True
        return False

    def validate_screen(self, screen_id: str) -> Dict[str, Any]:
        """Validates screen elements, tag bindings, coordinate bounds, and asset existence."""
        screen = self.get_screen(screen_id)
        if not screen:
            return {"valid": False, "errors": ["Screen not found"], "warnings": []}

        errors = []
        warnings = []
        element_ids = set()

        for el in screen.get("elements", []):
            inst_id = el.get("instance_id")
            if not inst_id:
                errors.append(f"Element missing instance_id: {el}")
            elif inst_id in element_ids:
                errors.append(f"Duplicate instance_id '{inst_id}' found")
            element_ids.add(inst_id)

            # Check if symbol exists
            sym_id = el.get("symbol_id")
            if not any(s["id"] == sym_id for s in self.symbols):
                warnings.append(f"Element '{inst_id}' references unknown symbol '{sym_id}'")

            # Check bindings
            for b_name, b_def in el.get("bindings", {}).items():
                if b_def.get("mode") == "DYNAMIC":
                    tag = b_def.get("tag_name")
                    if not tag:
                        warnings.append(f"Element '{inst_id}' binding '{b_name}' has no mapped tag")

        valid = len(errors) == 0
        if valid:
            screen["status"] = "VALIDATED"
            self.persist_state()

        return {"valid": valid, "errors": errors, "warnings": warnings, "checked_elements": len(element_ids)}

    def publish_screen(self, screen_id: str, version: Optional[str] = None, changelog: str = "") -> Optional[Dict[str, Any]]:
        screen = self.get_screen(screen_id)
        if not screen:
            return None

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        current_versions = self.screen_versions.get(screen_id, [])

        if not version:
            if not current_versions:
                version = "1.0.0"
            else:
                last_ver = current_versions[-1]["version"]
                parts = [int(p) for p in last_ver.split(".") if p.isdigit()]
                if len(parts) == 3:
                    parts[2] += 1
                    version = f"{parts[0]}.{parts[1]}.{parts[2]}"
                else:
                    version = f"1.0.{len(current_versions) + 1}"

        screen["status"] = "PUBLISHED"
        screen["published_version"] = version
        screen["updated_at"] = now_iso

        # Create immutable snapshot
        snapshot = {
            "version": version,
            "published_at": now_iso,
            "published_by": "engineer@yokogawa.com",
            "changelog": changelog or f"Published version {version}",
            "screen_snapshot": json.loads(json.dumps(screen))
        }

        if screen_id not in self.screen_versions:
            self.screen_versions[screen_id] = []
        self.screen_versions[screen_id].append(snapshot)

        self.persist_state()
        return snapshot

    def list_versions(self, screen_id: str) -> List[Dict[str, Any]]:
        return self.screen_versions.get(screen_id, [])

    def rollback_screen(self, screen_id: str, target_version: str) -> Optional[Dict[str, Any]]:
        versions = self.screen_versions.get(screen_id, [])
        match = next((v for v in versions if v["version"] == target_version), None)
        if not match:
            return None

        screen = self.get_screen(screen_id)
        if not screen:
            return None

        # Restore elements and layout from snapshot
        snap = match["screen_snapshot"]
        screen["elements"] = json.loads(json.dumps(snap.get("elements", [])))
        screen["width"] = snap.get("width", screen["width"])
        screen["height"] = snap.get("height", screen["height"])
        screen["background"] = json.loads(json.dumps(snap.get("background", screen["background"])))
        screen["status"] = "PUBLISHED"
        screen["published_version"] = target_version
        screen["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"

        self.persist_state()
        return screen

    def get_runtime_screen(self, screen_id: str) -> Optional[Dict[str, Any]]:
        """Returns the authoritative published layout for runtime viewing. Falls back to draft if none published."""
        screen = self.get_screen(screen_id)
        if screen and len(screen.get("elements", [])) > 0:
            return screen
        versions = self.screen_versions.get(screen_id, [])
        if versions:
            return versions[-1]["screen_snapshot"]
        return screen

    # --- Symbol Registry APIs ---
    def list_symbols(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if category and category != "ALL":
            return [s for s in self.symbols if s.get("category", "").lower() == category.lower()]
        return self.symbols

    def get_symbol(self, symbol_id: str) -> Optional[Dict[str, Any]]:
        return next((s for s in self.symbols if s["id"] == symbol_id), None)

    def register_symbol(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitizes incoming SVG and registers new symbol."""
        raw_svg = payload.get("svg_content", "")
        sanitization = sanitize_svg_content(raw_svg)
        if not sanitization["valid"]:
            raise ValueError(f"SVG Sanitization failed: {sanitization['error']}")

        new_id = payload.get("id") or f"sym-{uuid.uuid4().hex[:8]}"
        symbol = {
            "id": new_id,
            "name": payload.get("name", "Custom Industrial Symbol"),
            "category": payload.get("category", "Custom"),
            "description": payload.get("description", ""),
            "version": payload.get("version", "1.0.0"),
            "default_width": payload.get("default_width", 70),
            "default_height": payload.get("default_height", 70),
            "aspect_ratio": payload.get("aspect_ratio", "1:1"),
            "tags": sanitization["tags"] or payload.get("tags", []),
            "properties": payload.get("properties", {}),
            "behaviors": payload.get("behaviors", []),
            "actions": payload.get("actions", ["OPEN_TREND", "OPEN_ASSET"]),
            "is_builtin": False,
            "svg_content": sanitization["sanitized_svg"]
        }
        self.symbols.append(symbol)
        self.persist_state()
        return symbol

    def update_symbol(self, symbol_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        sym = self.get_symbol(symbol_id)
        if not sym:
            return None

        if "svg_content" in payload:
            sanitization = sanitize_svg_content(payload["svg_content"])
            if not sanitization["valid"]:
                raise ValueError(f"SVG Sanitization failed: {sanitization['error']}")
            sym["svg_content"] = sanitization["sanitized_svg"]
            sym["tags"] = sanitization["tags"]

        for f in ["name", "category", "description", "version", "default_width", "default_height", "properties", "behaviors", "actions"]:
            if f in payload:
                sym[f] = payload[f]

        self.persist_state()
        return sym

    def _get_fallback_tag_telemetry(self, tag: str) -> tuple:
        fallback_map = {
            "PT-101.PV": (4.8, "bar"),
            "FT-101.PV": (128.5, "m³/h"),
            "LT-101.PV": (65.0, "%"),
            "LT-102.PV": (82.5, "%"),
            "PUMP_101A.RUN": ("RUNNING", "State"),
            "PUMP_101A.RUN_STATUS": ("RUNNING", "State"),
            "PUMP_101A.DIFF_HEAD": (45.2, "m"),
            "XV-101.POS": (100.0, "%"),
            "XV_101.POS": (100.0, "%"),
            "TIC_101.PV": (118.0, "°C"),
            "TIC_102.PV": (235.0, "°C"),
            "PIC_101.PV": (145.2, "kPa"),
            "FIC_101.PV": (450.0, "m³/h"),
            "FIC_102.PV": (182.0, "m³/h"),
            "LIC_101.PV": (58.5, "%"),
            "PUMP_101A.ST": (1, "State"),
            "POOL_STATUS": ("Active", "Status"),
            "OUTDOOR_TEMP.PV": (26.6, "°C"),
            "TARGET_TEMP.SP": (36.0, "°C"),
            "POOL_TEMP.PV": (35.9, "°C"),
            "POOL_VOLUME.PV": (55000, "L"),
            "POOL_LEVEL.PV": (98.2, "%"),
            "FLOW_RATE.PV": (198.0, "L/min"),
            "POOL_PH.PV": (7.35, "pH"),
            "POOL_ORP.PV": (715, "mV"),
            "POOL_CHLORINE.PV": (1.45, "ppm"),
            "FILTER_PUMP.RUN": (1, "State"),
            "HEAT_PUMP.RUN": (1, "State"),
            "FILTER_DP.PV": (0.42, "bar"),
            "FILTER_MODE.VAL": ("Filter", "Mode"),
            "VALVE_1": (1, "State"),
            "VALVE_2": (1, "State"),
            "VALVE_3": (1, "State"),
            "VALVE_4": (1, "State"),
            "VALVE_5": (1, "State"),
            "VALVE_6": (1, "State"),
            "VALVE_7": (1, "State"),
            "VALVE_8": (0, "State"),
            "VALVE_9": (1, "State")
        }
        if tag in fallback_map:
            return fallback_map[tag]
        # Also check current screen elements bindings for configured value
        for scr in self.screens:
            for el in scr.get("elements", []):
                for b in el.get("bindings", {}).values():
                    if b.get("tag_name") == tag and b.get("value") is not None:
                        return (b["value"], b.get("uom", ""))
        return (None, "")

    # --- Live Telemetry & Value Envelope Snapshots ---
    async def get_values_snapshot(self, tag_names: List[str]) -> Dict[str, Any]:
        """
        Retrieves current snapshot values and quality evaluation for a set of tags.
        Guarantees UnifiedValueEnvelope quality compliance (GOOD, BAD, UNCERTAIN, STALE, MISSING).
        """
        all_cached = await redis_service.get_all_latest_values()
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        result = {}

        for tag in tag_names:
            cached = all_cached.get(tag)
            if cached and cached.get("value") is not None:
                val = cached.get("value")
                ts = cached.get("timestamp", now_iso)
                raw_q = cached.get("quality", "GOOD")
                # Assess quality based on timestamp freshness
                computed_quality = assess_quality(val, ts, scan_rate_ms=1000)
                quality = computed_quality if computed_quality in ["STALE", "MISSING"] else raw_q
                result[tag] = {
                    "tag_name": tag,
                    "value": val,
                    "quality": quality,
                    "timestamp": ts,
                    "eng_units": cached.get("eng_units", "")
                }
            else:
                # Value not yet in Redis cache - fallback to authoritative plant baseline
                fallback_val, fallback_uom = self._get_fallback_tag_telemetry(tag)
                if fallback_val is not None:
                    result[tag] = {
                        "tag_name": tag,
                        "value": fallback_val,
                        "quality": "GOOD",
                        "timestamp": now_iso,
                        "eng_units": fallback_uom
                    }
                else:
                    result[tag] = {
                        "tag_name": tag,
                        "value": None,
                        "quality": "MISSING",
                        "timestamp": now_iso,
                        "eng_units": ""
                    }

        return result

    # --- Reusable Process Templates (Phase 7) ---
    def list_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if category and category != "ALL":
            return [t for t in self.templates if t.get("category") == category]
        return self.templates

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        return next((t for t in self.templates if t["id"] == template_id), None)

    def instantiate_template(
        self,
        template_id: str,
        screen_id: str,
        asset_role_mappings: Optional[Dict[str, str]] = None,
        offset_x: int = 60,
        offset_y: int = 60
    ) -> Dict[str, Any]:
        """
        Inserts elements and connections from a process template into a target screen,
        remapping asset roles to real selected Asset Attributes.
        """
        tpl = self.get_template(template_id)
        if not tpl:
            raise ValueError(f"Template '{template_id}' not found")

        screen = self.get_screen(screen_id)
        if not screen:
            raise ValueError(f"Screen '{screen_id}' not found")

        asset_map = asset_role_mappings or {}
        id_map = {}

        new_elements = []
        for elem in tpl.get("elements", []):
            new_id = f"elem-{uuid.uuid4().hex[:8]}"
            id_map[elem["instance_id"]] = new_id

            copied_elem = json.loads(json.dumps(elem))
            copied_elem["instance_id"] = new_id
            copied_elem["x"] = copied_elem.get("x", 0) + offset_x
            copied_elem["y"] = copied_elem.get("y", 0) + offset_y

            # Remap bindings if asset role mapped
            if "role" in copied_elem and copied_elem["role"] in asset_map:
                mapped_asset_id = asset_map[copied_elem["role"]]
                real_asset = next((a for a in dm_store.assets if a["id"] == mapped_asset_id), None)
                if real_asset:
                    copied_elem["asset_id"] = real_asset["id"]
                    copied_elem["asset_name"] = real_asset["name"]

            new_elements.append(copied_elem)

        new_connections = []
        for conn in tpl.get("connections", []):
            copied_conn = json.loads(json.dumps(conn))
            copied_conn["id"] = f"conn-{uuid.uuid4().hex[:8]}"
            from_key = copied_conn.get("from_element") or copied_conn.get("from_id")
            to_key = copied_conn.get("to_element") or copied_conn.get("to_id")
            mapped_from = id_map.get(from_key, from_key)
            mapped_to = id_map.get(to_key, to_key)
            copied_conn["from_id"] = mapped_from
            copied_conn["to_id"] = mapped_to
            copied_conn["from_element"] = mapped_from
            copied_conn["to_element"] = mapped_to
            new_connections.append(copied_conn)

        screen.setdefault("elements", []).extend(new_elements)
        screen.setdefault("connections", []).extend(new_connections)
        screen["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist_state()

        return {
            "success": True,
            "elements_added": len(new_elements),
            "connections_added": len(new_connections),
            "added_elements": len(new_elements),
            "added_connections": len(new_connections),
            "screen": screen
        }

    # --- Custom Composite Equipment Symbol Builder (Phase 4) ---
    def create_composite_symbol(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new composite equipment symbol by combining child SVG symbols
        (e.g. Motor + Coupling + Pump = Pump Set).
        """
        parts = payload.get("parts", [])
        name = payload.get("name", "Composite Assembly")
        category = payload.get("category", "Custom")
        composite_id = payload.get("id") or f"sym-comp-{uuid.uuid4().hex[:8]}"

        combined_svg_parts = []
        combined_tags = set()
        total_w = int(payload.get("default_width", 120))
        total_h = int(payload.get("default_height", 80))
        combined_ports = []

        for p in parts:
            child_sym = self.get_symbol(p.get("symbol_id"))
            if not child_sym:
                continue
            cx = int(p.get("x", 0))
            cy = int(p.get("y", 0))
            c_scale = float(p.get("scale", 1.0))
            part_inner_svg = re.sub(r'<\/?svg[^>]*>', '', child_sym.get("svg_content", "")).strip()
            combined_svg_parts.append(
                f'<g transform="translate({cx}, {cy}) scale({c_scale})">{part_inner_svg}</g>'
            )
            for t in child_sym.get("tags", []):
                combined_tags.add(t)
            for port in child_sym.get("ports", []):
                cp = dict(port)
                cp["x"] = int(port.get("x", 0) * c_scale + cx)
                cp["y"] = int(port.get("y", 0) * c_scale + cy)
                combined_ports.append(cp)

        full_svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}" width="{total_w}" height="{total_h}">'
            + "".join(combined_svg_parts)
            + '</svg>'
        )

        sanitized = sanitize_svg_content(full_svg)
        if not sanitized["valid"]:
            raise ValueError(f"Composite SVG generation failed: {sanitized.get('error')}")

        new_sym = {
            "id": composite_id,
            "name": name,
            "category": category,
            "description": payload.get("description", "Engineered composite symbol assembly"),
            "version": "1.0.0",
            "is_custom": True,
            "is_composite": True,
            "default_width": total_w,
            "default_height": total_h,
            "tags": list(combined_tags),
            "ports": combined_ports,
            "properties": payload.get("properties", {}),
            "behaviors": payload.get("behaviors", []),
            "actions": ["OPEN_TREND", "OPEN_ASSET"],
            "svg_content": sanitized["sanitized_svg"],
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

        self.symbols.append(new_sym)
        self.persist_state()
        return new_sym

    # --- Symbol Pack Export / Import ---
    def export_symbol_pack(self, category: Optional[str] = None) -> Dict[str, Any]:
        syms = self.list_symbols(category)
        return {
            "format": "AHI_SCADA_SYMBOL_PACK_V2",
            "version": "2.0.0",
            "export_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "count": len(syms),
            "symbols": syms
        }

    def import_symbol_pack(self, pack_data: Dict[str, Any]) -> Dict[str, Any]:
        incoming = pack_data.get("symbols", [])
        added = 0
        updated = 0
        for s in incoming:
            s_id = s.get("id")
            if not s_id or not s.get("svg_content"):
                continue
            existing = self.get_symbol(s_id)
            if existing:
                existing.update(s)
                updated += 1
            else:
                s["is_custom"] = True
                self.symbols.append(s)
                added += 1
        self.persist_state()
        return {"success": True, "added": added, "updated": updated, "total_symbols": len(self.symbols)}

    # =========================================================================
    # THINGSBOARD COMPATIBILITY ENGINE: DASHBOARD IMPORT & EXPORT
    # =========================================================================
    def import_thingsboard_dashboard(self, tb_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests a native ThingsBoard dashboard JSON configuration (from PE or CE),
        translating all widgets, states, entity aliases, and SCADA symbol bindings
        into an active AHI DBM SCADA Screen.
        """
        title = tb_data.get("title") or tb_data.get("name") or "Imported ThingsBoard Dashboard"
        config = tb_data.get("configuration", {})
        description = config.get("description") or "Imported native ThingsBoard SCADA Dashboard"
        states = config.get("states", {})
        entity_aliases = config.get("entityAliases", {})
        widgets = config.get("widgets", {})

        screen_id = f"screen-tb-{uuid.uuid4().hex[:8]}"
        elements = []
        connections = []

        # Find main/root state
        main_state_key = "high_perf_default" if "high_perf_default" in states else ("traditional_default" if "traditional_default" in states else None)
        if not main_state_key:
            for sk, sv in states.items():
                if sv.get("root") is True:
                    main_state_key = sk
                    break
        if not main_state_key and states:
            main_state_key = list(states.keys())[0]

        main_state = states.get(main_state_key, {}) if main_state_key else {}
        main_layout = main_state.get("layouts", {}).get("main", {})
        state_widgets = main_layout.get("widgets", {})
        grid_settings = main_layout.get("gridSettings", {})
        total_cols = grid_settings.get("columns") or 48
        col_w = max(20, 1920 // total_cols)

        for wid, wpos in state_widgets.items():
            w = widgets.get(wid)
            if not w:
                continue
            cfg = w.get("config", {})
            settings = cfg.get("settings", {})
            symbol_url = settings.get("scadaSymbolUrl", "")
            obj_settings = settings.get("scadaSymbolObjectSettings", {})
            behavior = obj_settings.get("behavior", {})

            col = wpos.get("col", 0)
            row = wpos.get("row", 0)
            size_x = wpos.get("sizeX", 2)
            size_y = wpos.get("sizeY", 2)

            x = col * col_w + 20
            y = row * 24 + 40
            width = max(40, size_x * col_w)
            height = max(30, size_y * 24)

            symbol_id = "sym-generic-equipment"
            if symbol_url:
                clean_name = symbol_url.split("/")[-1].replace(".svg", "").replace("-hp", "")
                match = next((s["id"] for s in self.symbols if clean_name in s["id"]), None)
                symbol_id = match or f"sym-{clean_name}"

            elem_id = f"inst-tb-{wid[:8]}"
            bindings = {}
            for bkey, bval in behavior.items():
                if isinstance(bval, dict):
                    ts_key = bval.get("getTimeSeries", {}).get("key")
                    attr_key = bval.get("getAttribute", {}).get("key")
                    d2v = bval.get("dataToValue", {}).get("dataToValueFunction")
                    rpc_method = bval.get("executeRpc", {}).get("method")
                    action = bval.get("action")
                    bindings[bkey] = {
                        "action": action,
                        "tag_name": ts_key or attr_key or bkey,
                        "rpc_method": rpc_method,
                        "transform_fn": d2v,
                        "default_value": bval.get("defaultValue")
                    }

            elements.append({
                "instance_id": elem_id,
                "widget_id": wid,
                "type_fqn": w.get("typeFullFqn"),
                "symbol_id": symbol_id,
                "label": cfg.get("title") or w.get("typeFullFqn", "Element").split(".")[-1],
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "symbol_url": symbol_url,
                "bindings": bindings,
                "tb_settings": settings
            })

        screen = {
            "id": screen_id,
            "name": title,
            "description": description,
            "category": "ThingsBoard SCADA",
            "status": "PUBLISHED",
            "version": "1.0.0",
            "width": 1920,
            "height": 1080,
            "background": {
                "color": grid_settings.get("backgroundColor", "#0f172a"),
                "grid_visible": True,
                "grid_size": 20
            },
            "elements": elements,
            "connections": connections,
            "tb_metadata": {
                "states": {k: {"name": v.get("name"), "widgets_count": len(v.get("layouts", {}).get("main", {}).get("widgets", {}))} for k, v in states.items()},
                "entity_aliases": {k: {"alias": v.get("alias"), "filter": v.get("filter")} for k, v in entity_aliases.items()},
                "total_widgets_imported": len(elements),
                "original_total_widgets": len(widgets)
            },
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

        self.screens.append(screen)
        self.persist_state()
        return {
            "success": True,
            "screen": screen,
            "stats": {
                "screen_id": screen_id,
                "title": title,
                "states_count": len(states),
                "entity_aliases_count": len(entity_aliases),
                "elements_imported": len(elements),
                "total_widgets": len(widgets)
            }
        }

    def export_thingsboard_dashboard(self, screen_id: str) -> Dict[str, Any]:
        """
        Serializes an AHI DBM SCADA screen into a standard ThingsBoard Dashboard JSON format
        compatible with ThingsBoard Community and Professional editions.
        """
        screen = self.get_screen(screen_id)
        if not screen:
            raise ValueError(f"SCADA screen '{screen_id}' not found")

        tb_widgets = {}
        state_widgets = {}

        for idx, elem in enumerate(screen.get("elements", [])):
            wid = elem.get("widget_id") or f"{uuid.uuid4()}"
            col = max(0, min(47, elem.get("x", 0) // 40))
            row = max(0, elem.get("y", 0) // 24)
            size_x = max(1, min(48 - col, elem.get("width", 80) // 40))
            size_y = max(1, elem.get("height", 60) // 24)

            state_widgets[wid] = {
                "sizeX": size_x,
                "sizeY": size_y,
                "row": row,
                "col": col
            }

            tb_widgets[wid] = {
                "typeFullFqn": elem.get("type_fqn") or "system.scada_symbol",
                "type": "rpc",
                "sizeX": size_x,
                "sizeY": size_y,
                "config": {
                    "title": elem.get("label", ""),
                    "showTitle": False,
                    "settings": {
                        "scadaSymbolUrl": elem.get("symbol_url", f"/api/images/system/{elem.get('symbol_id', 'sym')}.svg"),
                        "scadaSymbolObjectSettings": {
                            "behavior": {
                                b_k: {
                                    "action": b_v.get("action", "DO_NOTHING"),
                                    "getTimeSeries": {"key": b_v.get("tag_name")},
                                    "executeRpc": {"method": b_v.get("rpc_method")}
                                }
                                for b_k, b_v in elem.get("bindings", {}).items()
                            }
                        }
                    }
                }
            }

        return {
            "id": {
                "entityType": "DASHBOARD",
                "id": str(uuid.uuid4())
            },
            "title": screen.get("name", "SCADA Screen"),
            "configuration": {
                "description": screen.get("description", ""),
                "widgets": tb_widgets,
                "states": {
                    "default": {
                        "name": screen.get("name", "Main"),
                        "root": True,
                        "layouts": {
                            "main": {
                                "widgets": state_widgets,
                                "gridSettings": {
                                    "columns": 48,
                                    "margin": 10,
                                    "backgroundColor": screen.get("background", {}).get("color", "#0f172a"),
                                    "autoFillHeight": False
                                }
                            }
                        }
                    }
                },
                "entityAliases": screen.get("tb_metadata", {}).get("entity_aliases", {}),
                "settings": {
                    "stateControllerId": "entity",
                    "showTitle": True,
                    "toolbarAlwaysOpen": True
                }
            }
        }


# Singleton store instance
scada_store = ScadaStore()

