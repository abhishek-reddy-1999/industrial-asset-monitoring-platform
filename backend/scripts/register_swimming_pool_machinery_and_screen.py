"""
Script: register_swimming_pool_machinery_and_screen.py
Adds comprehensive Swimming Pool & Industrial Water Treatment Machinery Symbols
and seeds the complete ThingsBoard Swimming Pool SCADA Screen replica into the application.
"""
import os
import sys
import json
import uuid
import datetime

# Symbols to add
SWIMMING_POOL_SYMBOLS = [
    {
        "id": "sym-swimming-pool-basin",
        "name": "Commercial Swimming Pool Basin (With Wave Animation)",
        "category": "Water Treatment & Pool",
        "subcategory": "Reservoirs",
        "description": "Commercial Olympic/leisure swimming pool basin with tiled coping, animated ripple water surface, return jets, and main suction drain.",
        "version": "2.0.0",
        "default_width": 520,
        "default_height": 190,
        "tags": ["pool_basin", "water_fill", "wave_surface", "drain_grate", "jet_nozzle"],
        "ports": [
            {"id": "suction_drain", "name": "Main Bottom Drain", "x": 260, "y": 190, "direction": "BOTTOM", "type": "OUTLET"},
            {"id": "skimmer_left", "name": "Skimmer Line Left", "x": 0, "y": 70, "direction": "LEFT", "type": "OUTLET"},
            {"id": "inlet_jets", "name": "Return Water Jets", "x": 520, "y": 60, "direction": "RIGHT", "type": "INLET"}
        ],
        "behaviors": [
            {"type": "fill", "target": "water_fill", "trigger": "level_pct"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 190" width="520" height="190">
  <defs>
    <linearGradient id="poolBorderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="poolWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="35%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="poolDepthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#075985" stop-opacity="0.95"/>
    </linearGradient>
    <pattern id="poolTilePattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="none" stroke="#38bdf8" stroke-width="0.3" stroke-opacity="0.25"/>
    </pattern>
    <filter id="poolWaterShimmer" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="2" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0"/>
      <feComposite in2="SourceGraphic" in="glare" operator="in"/>
    </filter>
  </defs>
  <!-- Outer Coping & Pool Rim -->
  <rect id="pool_basin" x="2" y="2" width="516" height="186" rx="6" fill="#1e293b" stroke="url(#poolBorderGrad)" stroke-width="4"/>
  <!-- Top Coping Lip -->
  <rect x="6" y="6" width="508" height="14" fill="#334155" stroke="#475569" stroke-width="1"/>
  <!-- Water Body -->
  <rect id="water_fill" x="8" y="22" width="504" height="162" fill="url(#poolWaterGrad)"/>
  <rect x="8" y="22" width="504" height="162" fill="url(#poolTilePattern)"/>
  <!-- Water Shimmer Ripple Waves -->
  <g opacity="0.45" stroke="#ffffff" stroke-width="1.2" fill="none" stroke-linecap="round">
    <path d="M 20 40 Q 60 36 100 40 T 180 40 T 260 40 T 340 40 T 420 40 T 500 40"/>
    <path d="M 30 70 Q 70 66 110 70 T 190 70 T 270 70 T 350 70 T 430 70 T 490 70"/>
    <path d="M 20 100 Q 60 96 100 100 T 180 100 T 260 100 T 340 100 T 420 100 T 500 100"/>
    <path d="M 40 130 Q 80 126 120 130 T 200 130 T 280 130 T 360 130 T 440 130 T 480 130"/>
    <path d="M 25 160 Q 65 156 105 160 T 185 160 T 265 160 T 345 160 T 425 160 T 495 160"/>
  </g>
  <!-- Surface Highlights -->
  <line x1="8" y1="24" x2="512" y2="24" stroke="#e0f2fe" stroke-width="2" stroke-opacity="0.8"/>
  <!-- Suction Drain Grate at Bottom -->
  <g id="drain_grate" transform="translate(240, 172)">
    <rect x="0" y="0" width="40" height="10" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
    <line x1="8" y1="2" x2="8" y2="8" stroke="#38bdf8" stroke-width="1"/>
    <line x1="16" y1="2" x2="16" y2="8" stroke="#38bdf8" stroke-width="1"/>
    <line x1="24" y1="2" x2="24" y2="8" stroke="#38bdf8" stroke-width="1"/>
    <line x1="32" y1="2" x2="32" y2="8" stroke="#38bdf8" stroke-width="1"/>
  </g>
  <!-- Return Jets on Right Wall -->
  <g id="jet_nozzle" transform="translate(506, 50)">
    <circle cx="0" cy="10" r="5" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
    <circle cx="0" cy="10" r="2" fill="#e0f2fe"/>
  </g>
  <!-- Depth Markings -->
  <text x="18" y="174" fill="#e0f2fe" font-size="10" font-weight="bold" font-family="sans-serif" opacity="0.8">0.9m</text>
  <text x="470" y="174" fill="#e0f2fe" font-size="10" font-weight="bold" font-family="sans-serif" opacity="0.8">2.2m</text>
</svg>"""
    },
    {
        "id": "sym-pool-centrif-pump",
        "name": "Commercial Pool Circulation Pump (Green Heavy Volute)",
        "category": "Pumps",
        "subcategory": "Centrifugal",
        "description": "Heavy-duty commercial swimming pool water circulation pump with green cast-iron ribbed motor stator, cooling fan cowl, volute casing, and bronze impeller.",
        "version": "2.0.0",
        "default_width": 140,
        "default_height": 95,
        "tags": ["motor_stator", "cooling_fins", "volute_casing", "impeller", "status_light", "power_switch"],
        "ports": [
            {"id": "suction", "name": "Suction Nozzle", "x": 0, "y": 60, "direction": "LEFT", "type": "INLET"},
            {"id": "discharge", "name": "Discharge Flange", "x": 18, "y": 0, "direction": "TOP", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "rotation", "target": "impeller", "trigger": "running", "speed": 1.5},
            {"type": "fill", "target": "status_light", "trigger": "state_color"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 95" width="140" height="95">
  <defs>
    <linearGradient id="greenMotorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="35%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <linearGradient id="greenVoluteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16a34a"/>
      <stop offset="60%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
    <linearGradient id="metalFlange" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <!-- Pump Mounting Foot & Baseplate -->
  <rect x="15" y="86" width="115" height="7" rx="1.5" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="25" y="78" width="16" height="8" fill="#15803d" stroke="#14532d" stroke-width="1"/>
  <rect x="100" y="78" width="16" height="8" fill="#15803d" stroke="#14532d" stroke-width="1"/>
  <!-- Motor Terminal Box on top -->
  <rect x="62" y="24" width="28" height="14" rx="2" fill="#15803d" stroke="#14532d" stroke-width="1.5"/>
  <!-- Motor Stator Casing (Green Ribbed) -->
  <rect id="motor_stator" x="48" y="38" width="75" height="42" rx="4" fill="url(#greenMotorGrad)" stroke="#14532d" stroke-width="2"/>
  <!-- Cooling Ribs / Fins -->
  <g id="cooling_fins" stroke="#14532d" stroke-width="1.8" stroke-linecap="round">
    <line x1="58" y1="41" x2="58" y2="77"/>
    <line x1="66" y1="41" x2="66" y2="77"/>
    <line x1="74" y1="41" x2="74" y2="77"/>
    <line x1="82" y1="41" x2="82" y2="77"/>
    <line x1="90" y1="41" x2="90" y2="77"/>
    <line x1="98" y1="41" x2="98" y2="77"/>
    <line x1="106" y1="41" x2="106" y2="77"/>
    <line x1="114" y1="41" x2="114" y2="77"/>
  </g>
  <!-- Rear Fan Cowl -->
  <path d="M 123 42 Q 133 42 133 59 Q 133 76 123 76 Z" fill="#15803d" stroke="#14532d" stroke-width="1.5"/>
  <line x1="128" y1="47" x2="128" y2="71" stroke="#14532d" stroke-width="1.2"/>
  <!-- Volute Casing & Flange Assembly -->
  <!-- Top Discharge Nozzle (Flange extends to edge y=0) -->
  <rect x="11" y="0" width="14" height="22" fill="url(#metalFlange)" stroke="#334155" stroke-width="1.5" rx="1"/>
  <line x1="8" y1="2" x2="28" y2="2" stroke="#cbd5e1" stroke-width="2.5"/>
  <!-- Suction Nozzle Left (extends to edge x=0) -->
  <rect x="0" y="52" width="16" height="16" fill="url(#metalFlange)" stroke="#334155" stroke-width="1.5" rx="1"/>
  <line x1="2" y1="48" x2="2" y2="72" stroke="#cbd5e1" stroke-width="2.5"/>
  <!-- Circular Volute Body -->
  <circle id="volute_casing" cx="28" cy="60" r="26" fill="url(#greenVoluteGrad)" stroke="#14532d" stroke-width="2.5"/>
  <!-- Intermediate Pump Housing Flange -->
  <rect x="42" y="44" width="8" height="32" rx="1.5" fill="#16a34a" stroke="#14532d" stroke-width="1.5"/>
  <!-- Rotating Impeller (transform-origin: 28 60) -->
  <g id="impeller" transform-origin="28 60">
    <circle cx="28" cy="60" r="8" fill="#0f172a" stroke="#fbbf24" stroke-width="1.5"/>
    <path d="M 28 52 Q 33 42 41 46 M 36 60 Q 46 64 42 73 M 28 68 Q 23 78 15 74 M 20 60 Q 10 56 14 47" stroke="#fbbf24" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <!-- Status Light LED -->
  <circle id="status_light" cx="40" cy="44" r="3.5" fill="#22c55e" stroke="#0f172a" stroke-width="1"/>
</svg>"""
    },
    {
        "id": "sym-sand-filter-multiport",
        "name": "Commercial Sand Filter with Multi-Port Valve",
        "category": "Water Treatment & Pool",
        "subcategory": "Filtration",
        "description": "Commercial high-rate sand pressure filter with vertical domed tank, 6-position multiport valve head, pressure gauge, and media viewing chamber.",
        "version": "2.0.0",
        "default_width": 110,
        "default_height": 140,
        "tags": ["filter_tank", "multiport_valve", "pressure_gauge", "mode_filter", "mode_backwash", "drain_spool"],
        "ports": [
            {"id": "inlet", "name": "Filter Raw Water Inlet", "x": 0, "y": 38, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Filtered Water Outlet", "x": 110, "y": 38, "direction": "RIGHT", "type": "OUTLET"},
            {"id": "waste_drain", "name": "Backwash Waste Drain", "x": 80, "y": 140, "direction": "BOTTOM", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "fill", "target": "filter_tank", "trigger": "tankColor"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 140" width="110" height="140">
  <defs>
    <linearGradient id="sandFilterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="35%" stop-color="#e2e8f0"/>
      <stop offset="70%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="valveHeadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="50%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <!-- Tank Base Stand Foot -->
  <path d="M 30 134 Q 55 130 80 134 L 88 140 L 22 140 Z" fill="#334155" stroke="#475569" stroke-width="1.5"/>
  <!-- Main Vertical Pressure Filter Tank (Domed Cylinder) -->
  <path id="filter_tank" d="M 12 56 C 12 40, 98 40, 98 56 L 98 116 C 98 132, 12 132, 12 116 Z" fill="url(#sandFilterGrad)" stroke="#475569" stroke-width="2"/>
  <!-- Tank Belly Clamp Seam Band -->
  <rect x="10" y="74" width="90" height="4" fill="#64748b" opacity="0.6"/>
  <!-- Multi-Port Control Valve on Top -->
  <!-- Valve Neck Collar -->
  <rect x="42" y="30" width="26" height="14" fill="#334155" stroke="#475569" stroke-width="1.5" rx="1"/>
  <!-- Multi-port Valve Head Body -->
  <rect id="multiport_valve" x="32" y="14" width="46" height="18" rx="3" fill="url(#valveHeadGrad)" stroke="#64748b" stroke-width="1.5"/>
  <!-- Multi-Port Selector Lever Handle -->
  <path d="M 45 14 Q 55 6 75 4 L 75 8 Q 57 10 49 14 Z" fill="#94a3b8" stroke="#334155" stroke-width="1"/>
  <!-- Pressure Gauge on Valve -->
  <g id="pressure_gauge" transform="translate(68, 4)">
    <circle cx="10" cy="10" r="8" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>
    <path d="M 6 13 A 6 6 0 0 1 14 13" fill="none" stroke="#22c55e" stroke-width="1.5"/>
    <line x1="10" y1="10" x2="13" y2="7" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
  </g>
  <!-- Left Inlet Spool (extends to x=0) -->
  <rect x="0" y="32" width="34" height="12" fill="#475569" stroke="#64748b" stroke-width="1.5"/>
  <line x1="0" y1="28" x2="0" y2="48" stroke="#94a3b8" stroke-width="2"/>
  <!-- Right Outlet Spool (extends to x=110) -->
  <rect x="76" y="32" width="34" height="12" fill="#475569" stroke="#64748b" stroke-width="1.5"/>
  <line x1="110" y1="28" x2="110" y2="48" stroke="#94a3b8" stroke-width="2"/>
  <!-- Mode Buttons Matrix Plate (ThingsBoard 6-Button Style) -->
  <g transform="translate(24, 78)" font-family="sans-serif" font-size="7" font-weight="600" text-anchor="middle">
    <!-- Row 1: Filter & Waste -->
    <rect x="0" y="0" width="30" height="12" rx="2" fill="#f8fafc" stroke="#22c55e" stroke-width="1.2"/>
    <circle cx="4" cy="6" r="2" fill="#22c55e"/>
    <text x="17" y="9" fill="#0f172a">Filter</text>
    <rect x="33" y="0" width="30" height="12" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="37" cy="6" r="1.5" fill="#94a3b8"/>
    <text x="49" y="9" fill="#64748b">Waste</text>
    <!-- Row 2: Backwash & Recirculate -->
    <rect x="0" y="15" width="30" height="12" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="4" cy="21" r="1.5" fill="#94a3b8"/>
    <text x="16" y="24" fill="#64748b">Backwash</text>
    <rect x="33" y="15" width="30" height="12" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="37" cy="21" r="1.5" fill="#94a3b8"/>
    <text x="49" y="24" fill="#64748b">Recirc</text>
    <!-- Row 3: Rinse & Closed -->
    <rect x="0" y="30" width="30" height="12" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="4" cy="36" r="1.5" fill="#94a3b8"/>
    <text x="16" y="39" fill="#64748b">Rinse</text>
    <rect x="33" y="30" width="30" height="12" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="37" cy="36" r="1.5" fill="#94a3b8"/>
    <text x="49" y="39" fill="#64748b">Closed</text>
  </g>
</svg>"""
    },
    {
        "id": "sym-heat-pump-chiller",
        "name": "Commercial Swimming Pool Heat Pump & Chiller",
        "category": "Thermal Equipment",
        "subcategory": "Heat Pumps",
        "description": "Outdoor swimming pool air-source heat pump / water chiller with axial condenser fan, digital temp display, and titanium heat exchanger.",
        "version": "2.0.0",
        "default_width": 140,
        "default_height": 115,
        "tags": ["casing", "fan_blades", "temp_display", "power_switch", "inlet_nozzle", "outlet_nozzle"],
        "ports": [
            {"id": "water_in", "name": "Cold Pool Water In", "x": 0, "y": 80, "direction": "LEFT", "type": "INLET"},
            {"id": "water_out", "name": "Heated Pool Water Out", "x": 0, "y": 45, "direction": "LEFT", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "rotation", "target": "fan_blades", "trigger": "running", "speed": 1.2},
            {"type": "fill", "target": "power_switch", "trigger": "state_color"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 115" width="140" height="115">
  <defs>
    <linearGradient id="hpCasingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <radialGradient id="hpGrillGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="85%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
  </defs>
  <!-- Mounting Feet -->
  <rect x="45" y="106" width="50" height="7" rx="2" fill="#334155" stroke="#475569" stroke-width="1.5"/>
  <rect x="58" y="100" width="24" height="7" fill="#64748b"/>
  <!-- Heat Pump Main Outer Enclosure -->
  <rect id="casing" x="10" y="8" width="126" height="94" rx="8" fill="url(#hpCasingGrad)" stroke="#cbd5e1" stroke-width="2"/>
  <!-- Left Side Water Flanges (Inlet and Outlet) -->
  <rect x="0" y="40" width="12" height="12" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
  <line x1="0" y1="36" x2="0" y2="56" stroke="#94a3b8" stroke-width="2"/>
  <rect x="0" y="74" width="12" height="12" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
  <line x1="0" y1="70" x2="0" y2="90" stroke="#94a3b8" stroke-width="2"/>
  <!-- Right Side Circular Condenser Fan Grille -->
  <circle cx="95" cy="55" r="32" fill="url(#hpGrillGrad)" stroke="#94a3b8" stroke-width="2"/>
  <!-- Wire Fan Grille Rings -->
  <circle cx="95" cy="55" r="24" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="2,3"/>
  <circle cx="95" cy="55" r="16" fill="none" stroke="#64748b" stroke-width="1"/>
  <!-- 3-Blade Aerodynamic Axial Fan -->
  <g id="fan_blades" transform-origin="95 55">
    <!-- Blade 1 -->
    <path d="M 95 55 C 91 40, 107 30, 95 25 C 88 35, 91 48, 95 55 Z" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
    <!-- Blade 2 -->
    <path d="M 95 55 C 108 59, 118 75, 122 65 C 112 58, 102 59, 95 55 Z" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
    <!-- Blade 3 -->
    <path d="M 95 55 C 82 66, 72 82, 68 72 C 78 65, 88 66, 95 55 Z" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
    <!-- Central Hub -->
    <circle cx="95" cy="55" r="6" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.5"/>
  </g>
  <!-- Left Digital Controller Panel -->
  <rect x="20" y="24" width="38" height="24" rx="3" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <text id="temp_display" x="39" y="41" fill="#38bdf8" font-size="14" font-weight="bold" font-family="monospace" text-anchor="middle">36</text>
  <!-- Up / Down Setpoint Arrows -->
  <g fill="#94a3b8" stroke="none">
    <polygon points="26,56 32,56 29,51"/>
    <polygon points="36,51 42,51 39,56"/>
  </g>
  <!-- Power Button Switch -->
  <circle id="power_switch" cx="34" cy="74" r="8" fill="#22c55e" stroke="#16a34a" stroke-width="1.5"/>
  <path d="M 34 69 L 34 73 M 31 71 A 4 4 0 1 0 37 71" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
</svg>"""
    },
    {
        "id": "sym-hair-lint-strainer",
        "name": "Hair & Lint Pre-Strainer Basket Pot",
        "category": "Piping & Fittings",
        "subcategory": "Strainers",
        "description": "Inline pump suction pre-strainer pot with transparent acrylic inspection lid, quick clamp, and perforated stainless steel basket.",
        "version": "2.0.0",
        "default_width": 55,
        "default_height": 75,
        "tags": ["strainer_body", "basket", "lid"],
        "ports": [
            {"id": "inlet", "name": "Raw Suction In", "x": 0, "y": 20, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Strained Suction Out", "x": 55, "y": 20, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 75" width="55" height="75">
  <defs>
    <linearGradient id="strainerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="35%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <!-- Top Transparent Lid with T-Bar Clamps -->
  <ellipse cx="27.5" cy="10" rx="20" ry="7" fill="#38bdf8" fill-opacity="0.5" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="23" y="2" width="9" height="5" rx="1" fill="#334155" stroke="#94a3b8" stroke-width="1"/>
  <!-- Left Inlet Flange -->
  <rect x="0" y="14" width="12" height="12" fill="#475569" stroke="#334155" stroke-width="1"/>
  <!-- Right Outlet Flange -->
  <rect x="43" y="14" width="12" height="12" fill="#475569" stroke="#334155" stroke-width="1"/>
  <!-- Main Strainer Chamber Pot -->
  <path id="strainer_body" d="M 8 10 L 8 60 C 8 72, 47 72, 47 60 L 47 10 Z" fill="url(#strainerGrad)" stroke="#334155" stroke-width="2"/>
  <!-- Internal Stainless Basket Visible Area -->
  <path id="basket" d="M 14 20 L 14 56 C 14 65, 41 65, 41 56 L 41 20 Z" fill="#1e293b" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2"/>
</svg>"""
    },
    {
        "id": "sym-dosing-canister-ph",
        "name": "In-Line Water Treatment & pH Dosing Chamber",
        "category": "Instrumentation",
        "subcategory": "Analyzers",
        "description": "In-line chemical treatment cell with pH electrode sensor probe, clear flow canister, and chemical injection quill.",
        "version": "2.0.0",
        "default_width": 55,
        "default_height": 85,
        "tags": ["canister_body", "probe", "badge"],
        "ports": [
            {"id": "inlet", "name": "Sample Inlet", "x": 0, "y": 25, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Sample Outlet", "x": 55, "y": 25, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 85" width="55" height="85">
  <defs>
    <linearGradient id="canisterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <!-- Top pH Label Badge -->
  <rect id="badge" x="12" y="2" width="31" height="16" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>
  <text x="27.5" y="14" fill="#0f172a" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">pH</text>
  <!-- Inlet / Outlet Flanges -->
  <rect x="0" y="20" width="10" height="10" fill="#475569" stroke="#334155" stroke-width="1"/>
  <rect x="45" y="20" width="10" height="10" fill="#475569" stroke="#334155" stroke-width="1"/>
  <!-- Canister Body -->
  <path id="canister_body" d="M 10 22 L 10 70 C 10 82, 45 82, 45 70 L 45 22 Z" fill="url(#canisterGrad)" stroke="#334155" stroke-width="1.8"/>
  <!-- Inner Glass Sensor Bulb -->
  <path d="M 22 24 L 22 62 C 22 68, 33 68, 33 62 L 33 24 Z" fill="#38bdf8" fill-opacity="0.4" stroke="#e0f2fe" stroke-width="1"/>
  <circle cx="27.5" cy="63" r="3" fill="#f59e0b"/>
</svg>"""
    },
    {
        "id": "sym-handwheel-gate-valve",
        "name": "Heavy Spoke Handwheel Gate Valve",
        "category": "Valves",
        "subcategory": "Manual Valves",
        "description": "Industrial flanged gate valve with green multi-spoke circular manual handwheel and rising stem.",
        "version": "2.0.0",
        "default_width": 70,
        "default_height": 65,
        "tags": ["valve_body", "handwheel", "stem"],
        "ports": [
            {"id": "inlet", "name": "Inlet Flange", "x": 0, "y": 45, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Outlet Flange", "x": 70, "y": 45, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 65" width="70" height="65">
  <!-- Valve Body (Opposing Triangles) -->
  <g id="valve_body">
    <polygon points="0,35 35,45 0,55" fill="#15803d" stroke="#14532d" stroke-width="2"/>
    <polygon points="70,35 35,45 70,55" fill="#15803d" stroke="#14532d" stroke-width="2"/>
    <circle cx="35" cy="45" r="4" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="0" y1="32" x2="0" y2="58" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="70" y1="32" x2="70" y2="58" stroke="#94a3b8" stroke-width="2.5"/>
  </g>
  <!-- Bonnet & Rising Stem -->
  <rect id="stem" x="32" y="16" width="6" height="22" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Circular Spoke Handwheel -->
  <g id="handwheel">
    <circle cx="35" cy="16" r="14" fill="none" stroke="#22c55e" stroke-width="3"/>
    <circle cx="35" cy="16" r="4" fill="#15803d" stroke="#14532d" stroke-width="1.5"/>
    <line x1="21" y1="16" x2="49" y2="16" stroke="#22c55e" stroke-width="2"/>
    <line x1="35" y1="2" x2="35" y2="30" stroke="#22c55e" stroke-width="2"/>
  </g>
</svg>"""
    },
    {
        "id": "sym-flowmeter-digital",
        "name": "Digital Inline Sight Flow Meter (L/min)",
        "category": "Instrumentation",
        "subcategory": "Flow",
        "description": "Sanitary inline flow meter spool with circular digital LED rate readout (L/min) and dual green LED status indicators.",
        "version": "2.0.0",
        "default_width": 65,
        "default_height": 55,
        "tags": ["flow_rate", "indicator_dots"],
        "ports": [
            {"id": "inlet", "name": "Flow In", "x": 0, "y": 28, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Flow Out", "x": 65, "y": 28, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [
            {"type": "text", "target": "flow_rate", "trigger": "pv_value"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 55" width="65" height="55">
  <!-- Flanged Pipe Spool -->
  <rect x="0" y="22" width="65" height="12" fill="#475569" stroke="#64748b" stroke-width="1.5"/>
  <!-- Circular Electronic Display Head -->
  <circle cx="32.5" cy="28" r="22" fill="#f8fafc" stroke="#22c55e" stroke-width="2.5"/>
  <!-- Dual Green LED Indicators -->
  <circle cx="26" cy="16" r="2" fill="#22c55e"/>
  <circle cx="39" cy="16" r="2" fill="#22c55e"/>
  <!-- Numeric Flow Readout -->
  <text id="flow_rate" x="32.5" y="29" fill="#0f172a" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">198</text>
  <text x="32.5" y="38" fill="#64748b" font-size="6.5" font-family="sans-serif" text-anchor="middle">L/min</text>
</svg>"""
    },
    {
        "id": "sym-analog-dial-level",
        "name": "Circular Analog Dial Water Level Gauge",
        "category": "Instrumentation",
        "subcategory": "Level",
        "description": "Circular analog water level indicator dial with calibrated E, 1/2, F scale sectors, 'Water =' label, and high-contrast needle.",
        "version": "2.0.0",
        "default_width": 60,
        "default_height": 60,
        "tags": ["dial_face", "needle"],
        "ports": [
            {"id": "mount", "name": "Flange Mount", "x": 60, "y": 30, "direction": "RIGHT", "type": "BIDIRECTIONAL"}
        ],
        "behaviors": [
            {"type": "rotation", "target": "needle", "trigger": "level_pct"}
        ],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <!-- Outer Bezel -->
  <circle cx="30" cy="30" r="28" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <circle cx="30" cy="30" r="25" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
  <!-- Arc Scale -->
  <path d="M 12 36 A 20 20 0 0 1 48 36" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <!-- Tick Marks -->
  <text x="12" y="30" fill="#0f172a" font-size="7" font-weight="bold" font-family="sans-serif">E</text>
  <text x="30" y="16" fill="#0f172a" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle">1/2</text>
  <text x="44" y="30" fill="#ef4444" font-size="7" font-weight="bold" font-family="sans-serif">F</text>
  <text x="30" y="42" fill="#0284c7" font-size="6" font-family="sans-serif" text-anchor="middle">Water =</text>
  <!-- Needle (pointing towards Full/35.9) -->
  <g id="needle" transform-origin="30 30">
    <line x1="30" y1="30" x2="43" y2="21" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>
    <circle cx="30" cy="30" r="3" fill="#0f172a"/>
  </g>
</svg>"""
    },
    {
        "id": "sym-uv-disinfection-reactor",
        "name": "UV Disinfection Reactor Chamber (316L SS)",
        "category": "Water Treatment & Pool",
        "subcategory": "Disinfection",
        "description": "High-output amalgam UV water disinfection reactor cylinder with quartz sleeve, status glow window, and sensor port.",
        "version": "2.0.0",
        "default_width": 120,
        "default_height": 50,
        "tags": ["reactor_body", "uv_glow"],
        "ports": [
            {"id": "inlet", "name": "Raw In", "x": 0, "y": 25, "direction": "LEFT", "type": "INLET"},
            {"id": "outlet", "name": "Disinfected Out", "x": 120, "y": 25, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50" width="120" height="50">
  <defs>
    <linearGradient id="uvChamberGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="40%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
  </defs>
  <rect x="0" y="18" width="15" height="14" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
  <rect x="105" y="18" width="15" height="14" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
  <rect id="reactor_body" x="15" y="8" width="90" height="34" rx="6" fill="url(#uvChamberGrad)" stroke="#475569" stroke-width="2"/>
  <!-- UV Quartz Sight Window with Violet Glow -->
  <rect id="uv_glow" x="42" y="17" width="36" height="16" rx="4" fill="#a855f7" fill-opacity="0.8" stroke="#d8b4fe" stroke-width="1.5"/>
  <text x="60" y="29" fill="#ffffff" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle">UV-C 254nm</text>
</svg>"""
    },
    {
        "id": "sym-chemical-dosing-skid",
        "name": "Chemical Dosing Metering Pump & Reagent Tank",
        "category": "Water Treatment & Pool",
        "subcategory": "Chemical Dosing",
        "description": "Automated diaphragm metering dosing pump mounted on chemical solution reservoir with suction lance.",
        "version": "2.0.0",
        "default_width": 75,
        "default_height": 105,
        "tags": ["tank", "pump_head", "level"],
        "ports": [
            {"id": "discharge", "name": "Chemical Injection Line", "x": 75, "y": 20, "direction": "RIGHT", "type": "OUTLET"}
        ],
        "behaviors": [],
        "svg_content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 105" width="75" height="105">
  <!-- Chemical Solution Tank (Semi-transparent polyethylene) -->
  <rect id="tank" x="8" y="32" width="58" height="70" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
  <rect id="level" x="12" y="48" width="50" height="50" fill="#38bdf8" fill-opacity="0.6"/>
  <!-- Graduations -->
  <line x1="12" y1="55" x2="22" y2="55" stroke="#64748b" stroke-width="1"/>
  <line x1="12" y1="70" x2="22" y2="70" stroke="#64748b" stroke-width="1"/>
  <line x1="12" y1="85" x2="22" y2="85" stroke="#64748b" stroke-width="1"/>
  <!-- Dosing Pump Head on Tank Lid -->
  <rect id="pump_head" x="22" y="10" width="32" height="22" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <circle cx="38" cy="21" r="5" fill="#0f172a" stroke="#fbbf24" stroke-width="1.2"/>
  <!-- Injection Tube -->
  <path d="M 54 21 L 75 21" stroke="#38bdf8" stroke-width="2" fill="none"/>
</svg>"""
    }
]

def main():
    print("Beginning registration of Swimming Pool Machinery Symbols...")
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    state_file = os.path.join(backend_dir, "scada_store_state.json")
    catalog_py = os.path.join(backend_dir, "app", "services", "scada_symbol_catalog.py")

    # 1. Update scada_store_state.json
    if os.path.exists(state_file):
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
    else:
        state = {"symbols": [], "screens": [], "screen_versions": {}}

    existing_syms = state.get("symbols", [])
    added_count = 0
    updated_count = 0

    for sym in SWIMMING_POOL_SYMBOLS:
        found = False
        for i, s in enumerate(existing_syms):
            if s.get("id") == sym["id"]:
                existing_syms[i] = sym
                found = True
                updated_count += 1
                break
        if not found:
            existing_syms.append(sym)
            added_count += 1

    state["symbols"] = existing_syms
    print(f"Updated scada_store_state.json: {added_count} symbols added, {updated_count} updated. Total symbols: {len(existing_syms)}")

    # 2. Add screen-swimming-pool to state["screens"]
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Check if screen-swimming-pool already exists
    screens = state.get("screens", [])
    swimming_pool_screen = {
        "id": "screen-swimming-pool",
        "name": "Commercial Swimming Pool SCADA System",
        "description": "Exact ThingsBoard SCADA Swimming Pool Replica: Closed-loop water circulation, high-rate sand filtration, heat pump climate control & chemical sanitization.",
        "site_id": "AQUATIC-CENTER-01",
        "site_name": "Olympia Aquatic Facility",
        "default_asset_id": "ast-swimming-pool",
        "width": 1920,
        "height": 1080,
        "background": {
            "color": "#f1f5f9",
            "show_grid": False,
            "grid_size": 20
        },
        "status": "PUBLISHED",
        "published_version": "2.0.0",
        "created_at": now_iso,
        "updated_at": now_iso,
        "owner": "operator@aquatics.org",
        "elements": [
            # 1. Main Swimming Pool Basin (Top Right)
            {
                "instance_id": "inst-pool-basin",
                "symbol_id": "sym-swimming-pool-basin",
                "label": "Swimming Pool Basin (55,000 L)",
                "x": 360,
                "y": 90,
                "width": 580,
                "height": 220,
                "z_index": 2,
                "bindings": {
                    "level_pct": {"mode": "LIVE_TAG", "tag_name": "POOL_LEVEL.PV", "value": 98.2},
                    "pv_value": {"mode": "LIVE_TAG", "tag_name": "POOL_VOLUME.PV", "value": 55000, "uom": "L"}
                }
            },
            # 2. Analog Dial Level Gauge Mounted on Pool Basin Left Wall
            {
                "instance_id": "inst-pool-level-dial",
                "symbol_id": "sym-analog-dial-level",
                "label": "Water Level Dial",
                "x": 288,
                "y": 150,
                "width": 75,
                "height": 75,
                "z_index": 4,
                "bindings": {
                    "level_pct": {"mode": "LIVE_TAG", "tag_name": "POOL_LEVEL.PV", "value": 98.2}
                }
            },
            # 3. Capacity Readout Badge Under Pool ("55000 L")
            {
                "instance_id": "inst-volume-badge",
                "symbol_id": "sym-hmi-digital-readout",
                "label": "Pool Water Capacity",
                "x": 580,
                "y": 330,
                "width": 130,
                "height": 45,
                "z_index": 3,
                "bindings": {
                    "pv_value": {"mode": "LIVE_TAG", "tag_name": "POOL_VOLUME.PV", "value": 55000},
                    "uom": {"mode": "MANUAL", "uom": "L"}
                }
            },
            # 4. Water Supply Inlet Line Valve (Left)
            {
                "instance_id": "inst-valve-supply",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 2 (Water Supply)",
                "x": 120,
                "y": 485,
                "width": 60,
                "height": 45,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_2", "value": 1}
                }
            },
            # 5. Pool Suction Isolation Valve
            {
                "instance_id": "inst-valve-drain-1",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 1 (Pool Drain Suction)",
                "x": 370,
                "y": 360,
                "width": 50,
                "height": 55,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_1", "value": 1}
                }
            },
            # 6. Hair & Lint Pre-Strainer Pot
            {
                "instance_id": "inst-hair-strainer",
                "symbol_id": "sym-hair-lint-strainer",
                "label": "Hair & Lint Pre-Filter",
                "x": 315,
                "y": 525,
                "width": 60,
                "height": 80,
                "z_index": 3,
                "bindings": {}
            },
            # 7. Main Circulation Pump (Green Heavy Volute)
            {
                "instance_id": "inst-circ-pump",
                "symbol_id": "sym-pool-centrif-pump",
                "label": "Primary Circulation Pump P-101",
                "x": 395,
                "y": 515,
                "width": 170,
                "height": 115,
                "z_index": 3,
                "bindings": {
                    "running": {"mode": "LIVE_TAG", "tag_name": "FILTER_PUMP.RUN", "value": 1},
                    "state_color": {"mode": "MANUAL", "value": "#22c55e"}
                }
            },
            # 8. Post-Pump Discharge Valve
            {
                "instance_id": "inst-valve-post-pump",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 4 (Pump Discharge)",
                "x": 585,
                "y": 510,
                "width": 55,
                "height": 45,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_4", "value": 1}
                }
            },
            # 9. High-Rate Commercial Sand Filter with Multi-Port Valve
            {
                "instance_id": "inst-sand-filter",
                "symbol_id": "sym-sand-filter-multiport",
                "label": "High-Rate Sand Pressure Filter",
                "x": 670,
                "y": 445,
                "width": 150,
                "height": 185,
                "z_index": 3,
                "bindings": {
                    "pv_value": {"mode": "LIVE_TAG", "tag_name": "FILTER_DP.PV", "value": 0.42, "uom": "bar"}
                }
            },
            # 10. Filter Waste Drain Line Valve
            {
                "instance_id": "inst-valve-waste",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 5 (Backwash Waste)",
                "x": 815,
                "y": 540,
                "width": 50,
                "height": 55,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_5", "value": 1}
                }
            },
            # 11. Digital Inline Flowmeter ("198 L/min")
            {
                "instance_id": "inst-flowmeter",
                "symbol_id": "sym-flowmeter-digital",
                "label": "Circulation Flow Transmitter",
                "x": 830,
                "y": 485,
                "width": 65,
                "height": 55,
                "z_index": 3,
                "bindings": {
                    "pv_value": {"mode": "LIVE_TAG", "tag_name": "FLOW_RATE.PV", "value": 198, "uom": "L/min"}
                }
            },
            # 12. Bypass Valve (Valve 8 - Closed in Heating Mode)
            {
                "instance_id": "inst-valve-bypass",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 8 (Heater Bypass)",
                "x": 980,
                "y": 490,
                "width": 55,
                "height": 45,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_8", "value": 0}
                }
            },
            # 13. Heater Inlet Valve (Valve 6)
            {
                "instance_id": "inst-valve-heat-in",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 6 (Heat Pump Inlet)",
                "x": 950,
                "y": 555,
                "width": 45,
                "height": 55,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_6", "value": 1}
                }
            },
            # 14. Heater Outlet Valve (Valve 7)
            {
                "instance_id": "inst-valve-heat-out",
                "symbol_id": "sym-valve-gate",
                "label": "Valve 7 (Heat Pump Outlet)",
                "x": 1035,
                "y": 555,
                "width": 45,
                "height": 55,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_7", "value": 1}
                }
            },
            # 15. Commercial Heat Pump Unit (Bottom Right)
            {
                "instance_id": "inst-heat-pump",
                "symbol_id": "sym-heat-pump-chiller",
                "label": "Pool Air-Source Heat Pump",
                "x": 1070,
                "y": 620,
                "width": 175,
                "height": 140,
                "z_index": 3,
                "bindings": {
                    "running": {"mode": "LIVE_TAG", "tag_name": "HEAT_PUMP.RUN", "value": 1},
                    "pv_value": {"mode": "LIVE_TAG", "tag_name": "TARGET_TEMP.SP", "value": 36.0}
                }
            },
            # 16. In-Line Chemical Treatment & pH Canister
            {
                "instance_id": "inst-ph-canister",
                "symbol_id": "sym-dosing-canister-ph",
                "label": "pH & Chlorine Injection Cell",
                "x": 1110,
                "y": 465,
                "width": 65,
                "height": 100,
                "z_index": 3,
                "bindings": {
                    "pv_value": {"mode": "LIVE_TAG", "tag_name": "POOL_PH.PV", "value": 7.35}
                }
            },
            # 17. Return Gate Valve with Spoke Handwheel (Valve 9)
            {
                "instance_id": "inst-valve-return",
                "symbol_id": "sym-handwheel-gate-valve",
                "label": "Valve 9 (Return Isolation Valve)",
                "x": 975,
                "y": 145,
                "width": 90,
                "height": 75,
                "z_index": 3,
                "bindings": {
                    "state_color": {"mode": "LIVE_TAG", "tag_name": "VALVE_9", "value": 1}
                }
            }
        ],
        "connections": [
            # Water supply line to suction header
            {
                "id": "conn-supply",
                "from_id": "inst-valve-supply",
                "to_id": "inst-hair-strainer",
                "line_type": "ORTHOGONAL",
                "color": "#94a3b8",
                "width": 4,
                "animated": True,
                "flow_speed": 1.2
            },
            # Pool bottom suction to strainer
            {
                "id": "conn-pool-drain",
                "from_id": "inst-pool-basin",
                "to_id": "inst-hair-strainer",
                "line_type": "ORTHOGONAL",
                "color": "#38bdf8",
                "width": 4,
                "animated": True,
                "flow_speed": 1.5
            },
            # Strainer to Pump
            {
                "id": "conn-strainer-pump",
                "from_id": "inst-hair-strainer",
                "to_id": "inst-circ-pump",
                "line_type": "ORTHOGONAL",
                "color": "#38bdf8",
                "width": 5,
                "animated": True,
                "flow_speed": 1.5
            },
            # Pump to Sand Filter
            {
                "id": "conn-pump-filter",
                "from_id": "inst-circ-pump",
                "to_id": "inst-sand-filter",
                "line_type": "ORTHOGONAL",
                "color": "#38bdf8",
                "width": 4,
                "animated": True,
                "flow_speed": 1.5
            },
            # Sand Filter to Flowmeter
            {
                "id": "conn-filter-flow",
                "from_id": "inst-sand-filter",
                "to_id": "inst-flowmeter",
                "line_type": "ORTHOGONAL",
                "color": "#38bdf8",
                "width": 4,
                "animated": True,
                "flow_speed": 1.5
            },
            # Flowmeter to Bypass Manifold
            {
                "id": "conn-flow-bypass",
                "from_id": "inst-flowmeter",
                "to_id": "inst-valve-bypass",
                "line_type": "ORTHOGONAL",
                "color": "#38bdf8",
                "width": 4,
                "animated": True,
                "flow_speed": 1.5
            },
            # Manifold to Heat Pump
            {
                "id": "conn-bypass-heater",
                "from_id": "inst-valve-heat-in",
                "to_id": "inst-heat-pump",
                "line_type": "ORTHOGONAL",
                "color": "#38bdf8",
                "width": 4,
                "animated": True,
                "flow_speed": 1.2
            },
            # Heat Pump to Return Line
            {
                "id": "conn-heater-ph",
                "from_id": "inst-heat-pump",
                "to_id": "inst-ph-canister",
                "line_type": "ORTHOGONAL",
                "color": "#f87171",
                "width": 4,
                "animated": True,
                "flow_speed": 1.2
            },
            # pH Canister to Return Gate Valve
            {
                "id": "conn-ph-valve",
                "from_id": "inst-ph-canister",
                "to_id": "inst-valve-return",
                "line_type": "ORTHOGONAL",
                "color": "#f87171",
                "width": 4,
                "animated": True,
                "flow_speed": 1.5
            },
            # Return Valve into Pool Basin
            {
                "id": "conn-valve-pool",
                "from_id": "inst-valve-return",
                "to_id": "inst-pool-basin",
                "line_type": "ORTHOGONAL",
                "color": "#f87171",
                "width": 4,
                "animated": True,
                "flow_speed": 1.5
            }
        ]
    }

    # Insert or update swimming_pool_screen
    existing_screen_idx = None
    for i, s in enumerate(screens):
        if s.get("id") == "screen-swimming-pool":
            existing_screen_idx = i
            break
            
    if existing_screen_idx is not None:
        screens[existing_screen_idx] = swimming_pool_screen
        print("Updated screen-swimming-pool in screens list.")
    else:
        screens.insert(0, swimming_pool_screen) # Put as first primary screen
        print("Added screen-swimming-pool as primary screen in screens list.")

    state["screens"] = screens

    with open(state_file, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

    print("Successfully updated scada_store_state.json with new machinery symbols and screen-swimming-pool.")

if __name__ == "__main__":
    main()
