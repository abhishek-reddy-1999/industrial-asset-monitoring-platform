import urllib.request
import json

req = urllib.request.urlopen('http://127.0.0.1:91/api/v2/di/scada/screens/screen-swimming-pool')
data = json.loads(req.read().decode('utf-8'))
print('Screen width x height:', data.get('width'), 'x', data.get('height'))
print('Elements count:', len(data.get('elements', [])))
print('Connections count:', len(data.get('connections', [])))

print('\nSample Connections with Flange Ports:')
for c in data.get('connections', [])[:6]:
    print(f"  {c['from_id']} [{c.get('from_port')}] -> {c['to_id']} [{c.get('to_port')}] ({c.get('color')})")

print('\nSample Elements on Centerline Y=520:')
for el in data.get('elements', []):
    if el.get('y', 0) >= 400:
        center_y = el['y'] + el['height'] / 2
        print(f"  {el['instance_id']}: y={el['y']}, h={el['height']}, center_y={center_y}")
