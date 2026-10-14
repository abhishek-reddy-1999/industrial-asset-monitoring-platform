import json

path = 'scada_store_state.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

pump_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
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

valve_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="60" height="90">
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

tank_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="100" height="140">
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

pipe_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 24" width="160" height="24">
  <!-- Outer Conduit Tube spanning full 160 width -->
  <rect id="pipe_body" x="0" y="3" width="160" height="18" fill="#1e293b" stroke="#475569" stroke-width="2" rx="2"/>
  <!-- Inner Animated Flow Centerline spanning full length -->
  <line id="flow_stream" x1="0" y1="12" x2="160" y2="12" stroke="#38bdf8" stroke-width="6" stroke-dasharray="12,8" stroke-linecap="butt"/>
</svg>"""

for s in data.get('symbols', []):
    if s['id'] == 'sym-pump-centrifugal':
        s['svg_content'] = pump_svg
    elif s['id'] == 'sym-valve-control':
        s['svg_content'] = valve_svg
    elif s['id'] == 'sym-tank-vertical':
        s['svg_content'] = tank_svg
    elif s['id'] == 'sym-pipe-flow':
        s['svg_content'] = pipe_svg

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated symbols in scada_store_state.json successfully')
