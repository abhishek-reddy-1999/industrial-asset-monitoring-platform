import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']
trad_state = config['states']['traditional_default']
widgets_map = trad_state['layouts']['main']['widgets']

for wid, pos in sorted(widgets_map.items(), key=lambda x: (x[1]['row'], x[1]['col'])):
    wobj = config['widgets'][wid]
    title = wobj.get('config', {}).get('title', '')
    type_fqn = wobj.get('typeFullFqn', '')
    actions = wobj.get('config', {}).get('actions', {})
    if actions:
        print(f"\nWIDGET: '{title}' ({type_fqn})")
        for action_src, act_list in actions.items():
            for act in act_list:
                print(f"  Source: {action_src} | Type: {act.get('type')} | Name: '{act.get('name')}' | TargetState: '{act.get('targetDashboardStateId')}' | OpenRightLayout: {act.get('openRightLayout')} | SetEntity: {act.get('setEntityId')}")

# Also check High Perf actions
print("\n--- HIGH PERF ACTIONS ---")
hp_state = config['states']['high_perf_default']
for wid, pos in hp_state['layouts']['main']['widgets'].items():
    wobj = config['widgets'][wid]
    title = wobj.get('config', {}).get('title', '')
    actions = wobj.get('config', {}).get('actions', {})
    if actions:
        for action_src, act_list in actions.items():
            for act in act_list:
                print(f"  HP Widget '{title}': TargetState -> '{act.get('targetDashboardStateId')}' (name: '{act.get('name')}')")
