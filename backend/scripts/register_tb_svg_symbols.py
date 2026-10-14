import json
import os
import re

svg_dir = 'frontend/public/assets/scada/thingsboard_svg'
state_path = 'backend/scada_store_state.json'

with open(state_path, 'r', encoding='utf-8') as f:
    state = json.load(f)

existing_symbols = state.get('symbols', [])
existing_ids = {s['id'] for s in existing_symbols}

new_symbols = []
for fname in sorted(os.listdir(svg_dir)):
    if not fname.endswith('.svg'):
        continue
    filepath = os.path.join(svg_dir, fname)
    with open(filepath, 'r', encoding='utf-8') as sf:
        svg_code = sf.read().strip()
    
    base_id = fname.replace('.svg', '').replace('_', '-')
    sym_id = f"sym-tb-{base_id}"
    
    # Generate human readable title
    parts = base_id.split('-')
    title = ' '.join(p.capitalize() for p in parts)
    title = title.replace('Hp', '(Hi-Perf)').replace('Tb', 'TB')
    
    # Determine dimensions from viewBox or width/height in SVG
    viewbox_match = re.search(r'viewBox=["\']([^"\']+)["\']', svg_code)
    def_w = 80
    def_h = 80
    if viewbox_match:
        vb = viewbox_match.group(1).split()
        if len(vb) == 4:
            try:
                def_w = int(float(vb[2]))
                def_h = int(float(vb[3]))
            except:
                pass
    
    sym_obj = {
        "id": sym_id,
        "name": f"ThingsBoard: {title}",
        "category": "ThingsBoard SCADA (Official)",
        "svg_content": svg_code,
        "default_width": min(max(def_w, 40), 240),
        "default_height": min(max(def_h, 40), 240),
        "author": "ThingsBoard Cloud (Official Reverse-Engineered)",
        "tags": ["thingsboard", "official", "vector", "pool", "scada"] + parts
    }
    
    if sym_id in existing_ids:
        # Update existing
        for idx, s in enumerate(existing_symbols):
            if s['id'] == sym_id:
                existing_symbols[idx] = sym_obj
    else:
        new_symbols.append(sym_obj)

state['symbols'] = existing_symbols + new_symbols

with open(state_path, 'w', encoding='utf-8') as f:
    json.dump(state, f, indent=2, ensure_ascii=False)

print(f"Registered {len(new_symbols)} new official ThingsBoard symbols into scada_store_state.json! Total symbols: {len(state['symbols'])}")
