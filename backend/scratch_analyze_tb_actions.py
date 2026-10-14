import json

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['configuration']
widgets = cfg.get('widgets', {})
states = cfg.get('states', {})

print(f"Total widgets: {len(widgets)}")

# Examine actions across all widgets
actions_summary = []
for wid, w in widgets.items():
    title = w.get('title')
    w_type = w.get('typeFullFqn')
    config = w.get('config', {})
    actions = config.get('actions', {})
    datasources = config.get('datasources', [])
    
    # check actions
    if actions:
        for action_src, action_list in actions.items():
            for act in action_list:
                act_type = act.get('type')
                target_state = act.get('targetDashboardStateId')
                act_name = act.get('name')
                actions_summary.append({
                    'widget_id': wid,
                    'title': title,
                    'type': w_type,
                    'source': action_src,
                    'name': act_name,
                    'action_type': act_type,
                    'target_state': target_state,
                    'details': act
                })

print(f"\nTotal actions found: {len(actions_summary)}")
for act in actions_summary:
    print(f"Widget [{act['type']}] '{act['title']}': on '{act['source']}' -> {act['action_type']} targetState='{act['target_state']}' (name='{act['name']}')")
