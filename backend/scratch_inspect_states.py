import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']
states = config['states']

for s_id, s_data in states.items():
    print('====================================')
    print(f"STATE: '{s_id}' | Name: '{s_data.get('name')}'")
    layouts = s_data.get('layouts', {})
    for lay_id, lay in layouts.items():
        w_layout = lay.get('widgets', {})
        grid = lay.get('gridSettings', {})
        print(f"  Layout '{lay_id}': {len(w_layout)} widgets. Grid: cols={grid.get('columns')}, margin={grid.get('marginsEnabled')}")
        # list widgets in this layout
        for wid, wpos in list(w_layout.items())[:6]:
            wobj = config['widgets'].get(wid, {})
            title = wobj.get('config', {}).get('title', '')
            fqn = wobj.get('typeFullFqn', '')
            print(f"    - [{wpos.get('col')},{wpos.get('row')}] {wpos.get('sizeX')}x{wpos.get('sizeY')} : '{title}' ({fqn})")
