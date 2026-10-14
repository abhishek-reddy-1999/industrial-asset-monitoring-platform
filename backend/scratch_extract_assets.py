import json
import re

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    text = f.read()
    data = json.loads(text)

api_images = set(re.findall(r'/api/images/[^\s"\'\\]+', text))
svg_refs = set(re.findall(r'[^"\s\':\(\)]+\.svg', text))
png_refs = set(re.findall(r'[^"\s\':\(\)]+\.png', text))

print("=== API IMAGES ===")
for img in sorted(api_images):
    print(img)

print("\n=== SVG REFS ===")
for svg in sorted(svg_refs):
    print(svg)

print("\n=== PNG REFS ===")
for png in sorted(png_refs):
    print(png)

# Check all widget types and their titles/descriptors
cfg = data['configuration']
widgets = cfg.get('widgets', {})
print(f"\nTotal widgets: {len(widgets)}")

type_counts = {}
for wid, w in widgets.items():
    fqn = w.get('typeFullFqn', 'unknown')
    type_counts[fqn] = type_counts.get(fqn, 0) + 1

print("\n=== WIDGET TYPE COUNTS ===")
for fqn, c in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"{fqn}: {c}")
