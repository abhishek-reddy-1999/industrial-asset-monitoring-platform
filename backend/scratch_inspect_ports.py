import json

with open('backend/scada_store_state.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sym_dict = {s['id']: s for s in data['symbols']}
pool_screen = next(s for s in data['screens'] if s['id'] == 'screen-swimming-pool')

print("--- SCREEN ELEMENTS AND PORTS ---")
for el in pool_screen['elements']:
    sym = sym_dict.get(el['symbol_id'])
    port_list = []
    if sym:
        for p in sym.get('ports', []):
            port_list.append(f"{p['id']}@{p['x']},{p['y']}")
    print(f"{el['instance_id']} ({el['symbol_id']}): x={el['x']}, y={el['y']}, w={el['width']}, h={el['height']}, ports={port_list}")
