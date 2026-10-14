import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']
trad_state = config['states']['traditional_default']
widgets_map = trad_state['layouts']['main']['widgets']

for wid in widgets_map.keys():
    w = config['widgets'][wid]
    title = w.get('config', {}).get('title', '')
    fqn = w.get('typeFullFqn', '')
    if any(k in fqn for k in ['pump', 'filter', 'heat', 'valve', 'flow']):
        actions = w.get('config', {}).get('actions', {})
        settings = w.get('config', {}).get('settings', {})
        datasources = w.get('config', {}).get('datasources', [])
        print(f"Widget: '{title}' ({fqn})")
        print(f"  Actions: {actions}")
        print(f"  Settings: {json.dumps(settings)[:150]}")
        for ds in datasources:
            keys = [k.get('name') for k in ds.get('dataKeys', [])]
            print(f"  Datasource: alias='{ds.get('entityAliasId')}', keys={keys}")
        print()
