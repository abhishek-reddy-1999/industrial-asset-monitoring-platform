import json

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['configuration']
widgets = cfg.get('widgets', {})
states = cfg.get('states', {})
aliases = cfg.get('entityAliases', {})

trad = states.get('traditional_default', {})
layouts = trad.get('layouts', {}).get('main', {})
grid_widgets = layouts.get('widgets', {})

print(f"=== TRADITIONAL DEFAULT WIDGETS ({len(grid_widgets)}) ===")
items = []
for wid, l in grid_widgets.items():
    w = widgets.get(wid, {})
    fqn = w.get('typeFullFqn', '')
    title = w.get('title', '')
    row = l.get('row', 0)
    col = l.get('col', 0)
    sx = l.get('sizeX', 0)
    sy = l.get('sizeY', 0)
    
    # get datasource info
    config = w.get('config', {})
    datasources = config.get('datasources', [])
    ds_info = []
    for ds in datasources:
        alias_id = ds.get('entityAliasId')
        alias_name = aliases.get(alias_id, {}).get('alias') if alias_id else 'None'
        data_keys = [dk.get('name') for dk in ds.get('dataKeys', [])]
        ds_info.append(f"{alias_name}: {data_keys}")
    
    settings = config.get('settings', {})
    actions = config.get('actions', {})
    
    items.append({
        'wid': wid,
        'fqn': fqn,
        'title': title,
        'row': row,
        'col': col,
        'sx': sx,
        'sy': sy,
        'ds': ds_info,
        'actions': list(actions.keys()),
        'bg_image': settings.get('backgroundImage') or settings.get('icon') or ''
    })

# Sort items by row, then col
items.sort(key=lambda x: (x['row'], x['col']))

for it in items:
    print(f"Row {it['row']:2d}, Col {it['col']:2d} [w={it['sx']}, h={it['sy']}] -> {it['fqn']} | DS: {it['ds']} | Actions: {it['actions']}")
