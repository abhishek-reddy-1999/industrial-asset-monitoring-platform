import json

data = json.load(open('backend/scada_store_state.json', encoding='utf-8'))
syms = {s['id']: s for s in data.get('symbols', [])}

for sid in ['sym-3d-pool-basin', 'sym-3d-lint-strainer', 'sym-3d-pool-pump', 'sym-3d-sand-filter', 'sym-3d-flow-meter', 'sym-3d-heat-pump', 'sym-dosing-canister-ph', 'sym-3d-spoke-valve']:
    s = syms.get(sid)
    if s:
        print(f"=== {sid} ({s.get('default_width')}x{s.get('default_height')}) ===")
        for p in s.get('ports', []):
            print(f"  port {p.get('id'):12} x={p.get('x')} y={p.get('y')} dir={p.get('direction')}")
