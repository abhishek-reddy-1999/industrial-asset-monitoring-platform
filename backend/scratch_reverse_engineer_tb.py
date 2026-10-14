import re
import urllib.request

u = 'https://static.thingsboard.cloud/chunk-TGZEYIBT.js'
req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
data = urllib.request.urlopen(req).read().decode('utf-8')
for m in re.finditer(r'.{0,100}publicLogin.{0,300}', data):
    print(m.group(0))
