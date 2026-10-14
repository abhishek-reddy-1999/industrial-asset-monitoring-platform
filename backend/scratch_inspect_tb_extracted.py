import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
print('Title:', data.get('title'))
configuration = data.get('configuration', {})
print('Configuration keys:', list(configuration.keys()))

states = configuration.get('states', {})
print('\n--- STATES (', len(states), ') ---')
for state_id, state_obj in states.items():
    print(f"State ID: {state_id} | Name: {state_obj.get('name')} | Root: {state_obj.get('root')}")

widgets = configuration.get('widgets', {})
print(f'\n--- WIDGETS ({len(widgets)}) ---')
widget_summaries = []
for wid, w in widgets.items():
    type_full = w.get('typeFullFqn', '')
    title = w.get('config', {}).get('title', '')
    size_x = w.get('sizeX')
    size_y = w.get('sizeY')
    col = w.get('col')
    row = w.get('row')
    bundle = w.get('bundleAlias', '')
    type_id = w.get('typeId', '')
    widget_summaries.append({
        'id': wid,
        'title': title,
        'typeFullFqn': type_full,
        'bundle': bundle,
        'typeId': type_id,
        'size': (size_x, size_y),
        'pos': (col, row)
    })
    print(f"[{wid}] Title: '{title}' | Type: {type_full} | Bundle: {bundle}")

entity_aliases = configuration.get('entityAliases', {})
print(f'\n--- ENTITY ALIASES ({len(entity_aliases)}) ---')
for aid, a in entity_aliases.items():
    print(f"Alias: {a.get('alias')} | Filter Type: {a.get('filter', {}).get('type')} | Entity: {a.get('filter', {}).get('singleEntity', {})}")
