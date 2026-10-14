import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']

for state_id in ['traditional_sand_filter', 'traditional_water_pump', 'traditional_heat_pump']:
    s = config['states'][state_id]
    print(f"\n==================== STATE: {state_id} ({s.get('name')}) ====================")
    w_map = s['layouts']['main']['widgets']
    for wid, pos in sorted(w_map.items(), key=lambda x: (x[1]['row'], x[1]['col'])):
        w = config['widgets'][wid]
        title = w.get('config', {}).get('title', '')
        fqn = w.get('typeFullFqn', '')
        datasources = w.get('config', {}).get('datasources', [])
        keys = []
        for ds in datasources:
            keys.extend([k.get('name') for k in ds.get('dataKeys', [])])
        print(f"[{pos['col']:2d},{pos['row']:2d}] {pos['sizeX']:2d}x{pos['sizeY']:2d} | '{title}' | {fqn} | Keys: {keys}")
