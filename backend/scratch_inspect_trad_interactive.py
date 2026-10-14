import json

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['configuration']
widgets = cfg.get('widgets', {})
aliases = cfg.get('entityAliases', {})
trad = cfg.get('states', {}).get('traditional_default', {}).get('layouts', {}).get('main', {}).get('widgets', {})

print("=== INTERACTIVE ELEMENTS & MAPPINGS IN TRADITIONAL DEFAULT ===")
for wid, l in trad.items():
    w = widgets.get(wid, {})
    fqn = w.get('typeFullFqn', '')
    title = w.get('title', '')
    cfg_w = w.get('config', {})
    ds = cfg_w.get('datasources', [])
    settings = cfg_w.get('settings', {})
    actions = cfg_w.get('actions', {})
    
    # print non-pipe widgets or widgets with datasources / actions / titles
    if 'pipe' not in fqn or ds or actions or title:
        alias_names = []
        keys = []
        for d in ds:
            aid = d.get('entityAliasId')
            alias_names.append(aliases.get(aid, {}).get('alias', aid))
            for k in d.get('dataKeys', []):
                keys.append(f"{k.get('name')}:{k.get('label')}")
        
        print(f"[{fqn}] title='{title}', row={l.get('row')}, col={l.get('col')}, w={l.get('sizeX')}, h={l.get('sizeY')}")
        if alias_names:
            print(f"   Aliases: {alias_names}, Keys: {keys}")
        if actions:
            print(f"   Actions: {actions}")
        if settings:
            # print select settings
            keys_to_show = {k: v for k, v in settings.items() if k in ['title', 'showTitle', 'icon', 'stateEntityParamName', 'behavior', 'targetState', 'action']}
            if keys_to_show:
                print(f"   Settings: {keys_to_show}")
