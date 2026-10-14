import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']

single_states = [
    'traditional_flow_rate',
    'traditional_ph_filter',
    'traditional_temperature',
    'traditional_target_temperature',
    'traditional_outdoor_temperature',
    'traditional_water_level_pool',
    'traditional_water_level'
]

for sid in single_states:
    s = config['states'].get(sid)
    if not s: continue
    print(f"\nSTATE: {sid} ({s.get('name')})")
    for wid in s['layouts']['main']['widgets'].keys():
        w = config['widgets'][wid]
        print(f"  Title: '{w.get('config', {}).get('title')}' | Type: {w.get('typeFullFqn')}")
        for ds in w.get('config', {}).get('datasources', []):
            keys = [k.get('name') for k in ds.get('dataKeys', [])]
            print(f"    Datasource entity: {ds.get('entityAliasId')} | Keys: {keys}")
