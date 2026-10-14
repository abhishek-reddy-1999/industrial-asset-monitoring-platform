import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']
trad_state = config['states']['traditional_default']
widgets_map = trad_state['layouts']['main']['widgets']

print(f"Total widgets in traditional_default: {len(widgets_map)}")

for wid, pos in sorted(widgets_map.items(), key=lambda x: (x[1]['row'], x[1]['col'])):
    wobj = config['widgets'][wid]
    title = wobj.get('config', {}).get('title', '')
    type_fqn = wobj.get('typeFullFqn', '')
    col = pos.get('col')
    row = pos.get('row')
    sizeX = pos.get('sizeX')
    sizeY = pos.get('sizeY')
    settings = wobj.get('config', {}).get('settings', {})
    actions = wobj.get('config', {}).get('actions', {})
    print(f"[{col:2d},{row:2d}] {sizeX:2d}x{sizeY:2d} | '{title}' | {type_fqn} | Actions: {list(actions.keys())}")
