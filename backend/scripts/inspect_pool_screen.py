import json

with open("backend/scada_store_state.json", "r", encoding="utf-8") as f:
    d = json.load(f)

s = next(x for x in d["screens"] if x["id"] == "screen-swimming-pool")
print("=== ELEMENTS ===")
for e in s["elements"]:
    print(f"{e['instance_id']:26} | x={e['x']:4} y={e['y']:4} w={e['width']:4} h={e['height']:4} | {e['label']}")

print("\n=== CONNECTIONS ===")
for c in s.get("connections", []):
    print(f"{c['id']:26} | {c.get('from_id')}:{c.get('from_port')} -> {c.get('to_id')}:{c.get('to_port')} | color={c.get('color')}")
