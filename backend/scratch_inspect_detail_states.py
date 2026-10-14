import json

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['configuration']
widgets = cfg.get('widgets', {})
aliases = cfg.get('entityAliases', {})
states = cfg.get('states', {})

for state_id in [
    'traditional_sand_filter',
    'traditional_water_pump',
    'traditional_heat_pump',
    'traditional_flow_rate',
    'traditional_ph_filter',
    'traditional_temperature',
    'traditional_target_temperature',
    'traditional_outdoor_temperature',
    'traditional_water_level_pool',
    'alarms'
]:
    s_obj = states.get(state_id, {})
    layout = s_obj.get('layouts', {}).get('main', {})
    w_map = layout.get('widgets', {})
    print(f"\n================ STATE: {state_id} ('{s_obj.get('name')}') ================")
    for wid, pos in w_map.items():
        w = widgets.get(wid, {})
        fqn = w.get('typeFullFqn', '')
        title = w.get('title', '')
        cfg_w = w.get('config', {})
        ds = cfg_w.get('datasources', [])
        keys = []
        for d in ds:
            aid = d.get('entityAliasId')
            aname = aliases.get(aid, {}).get('alias', aid)
            for k in d.get('dataKeys', []):
                keys.append(f"{aname}.{k.get('name')}")
        print(f"  * [{fqn}] title='{title}', row={pos.get('row')}, col={pos.get('col')}, w={pos.get('sizeX')}, h={pos.get('sizeY')}")
        if keys:
            print(f"    Datasources: {keys}")
