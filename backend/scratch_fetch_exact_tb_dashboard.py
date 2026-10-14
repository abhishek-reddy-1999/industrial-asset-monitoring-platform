import urllib.request
import json

public_id = "7aa99e80-8acd-11ef-a59e-a9c993dbec14"
dashboard_id = "231a5800-ce96-11ef-852e-bd51c2b30fde"

# 1. Login with publicId
login_url = "https://thingsboard.cloud/api/auth/login/public"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*'
}
req = urllib.request.Request(login_url, data=json.dumps({"publicId": public_id}).encode('utf-8'), headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print('Login success! Token keys:', list(res.keys()))
        token = res.get('token')
except Exception as e:
    print('Login failed:', e)
    exit(1)

# 2. Fetch the dashboard configuration with the Bearer token!
dash_url = f"https://thingsboard.cloud/api/dashboard/{dashboard_id}"
dash_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Authorization': f'Bearer {token}',
    'Accept': 'application/json, text/plain, */*'
}
dash_req = urllib.request.Request(dash_url, headers=dash_headers)
try:
    with urllib.request.urlopen(dash_req) as resp:
        dash_data = json.loads(resp.read().decode('utf-8'))
        print('Dashboard retrieved! Title:', dash_data.get('title'))
        open('thingsboard_pool_reverse_engineered.json', 'w', encoding='utf-8').write(
            json.dumps(dash_data, indent=2)
        )
        print('Saved thingsboard_pool_reverse_engineered.json successfully!')
except Exception as e:
    print('Failed to get dashboard:', e)
