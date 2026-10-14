import urllib.request
import re

url = 'https://thingsboard.io/use-cases/scada/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8')
        imgs = re.findall(r'src=["\']([^"\']+\.(?:png|jpg|jpeg|svg|webp))["\']', content)
        print(f"Total images found: {len(imgs)}")
        for img in set(imgs):
            if any(k in img.lower() for k in ['scada', 'pool', 'filter', 'pump', 'traditional', 'high', 'equip']):
                print('Image:', img)
except Exception as e:
    print('Error:', e)
