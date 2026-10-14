import json

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['configuration']
states = cfg.get('states', {})
widgets = cfg.get('widgets', {})
aliases = cfg.get('entityAliases', {})

print("=== ENTITY ALIASES ===")
alias_map = {}
for aid, aval in aliases.items():
    alias_name = aval.get('alias')
    filter_info = aval.get('filter', {})
    entity_type = filter_info.get('entityType')
    entity_name = filter_info.get('entityName') or filter_info.get('singleEntity', {}).get('entityType')
    alias_map[aid] = alias_name
    print(f"- [{aid}] '{alias_name}': type={entity_type}, filter={filter_info}")

print(f"\n=== STATES COUNT: {len(states)} ===")
for state_id, state_obj in states.items():
    state_name = state_obj.get('name')
    layouts = state_obj.get('layouts', {}).get('main', {})
    grid_widgets = layouts.get('widgets', {})
    grid_settings = layouts.get('gridSettings', {})
    cols = grid_settings.get('columns', 24)
    print(f"\nState: '{state_id}' ('{state_name}') | Columns: {cols} | Widgets in layout: {len(grid_widgets)}")
    
    # Sample widgets in this state
    for wid, layout_item in list(grid_widgets.items())[:6]:
        w = widgets.get(wid, {})
        w_title = w.get('title')
        w_type = w.get('typeFullFqn')
        col = layout_item.get('col')
        row = layout_item.get('row')
        size_x = layout_item.get('sizeX')
        size_y = layout_item.get('sizeY')
        print(f"   * [{w_type}] '{w_title}' at row={row}, col={col}, w={size_x}, h={size_y}")
