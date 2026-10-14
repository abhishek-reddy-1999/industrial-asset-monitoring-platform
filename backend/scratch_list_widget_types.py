import json

data = json.load(open('thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8'))
config = data['configuration']
widgets = config['widgets']

fqns = {}
for wid, w in widgets.items():
    fqn = w.get('typeFullFqn', '')
    title = w.get('config', {}).get('title', '')
    if fqn not in fqns:
        fqns[fqn] = []
    fqns[fqn].append(title)

print(f"Total unique widget types: {len(fqns)}")
for fqn, titles in sorted(fqns.items()):
    sample_titles = list(set(titles))[:4]
    print(f"- {fqn} (count: {len(titles)}, samples: {sample_titles})")
