import requests
BASE_URL = "http://127.0.0.1:8000"

# Assuming superadmin or school admin login is available
# I'll just login as superadmin, wait, endpoint is for school_admin
login_data = {"username": "schooladmin", "password": "password123"}
resp = requests.post(f"{BASE_URL}/token", data=login_data)
if resp.status_code != 200:
    print("Login failed:", resp.text)
    exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

res = requests.get(f"{BASE_URL}/school-admin/questions/?grade_id=1&subject_id=1&page=1&page_size=25", headers=headers)
print("Status:", res.status_code)
try:
    data = res.json()
    items = data.get("items", [])
    print(f"Found {len(items)} questions.")
except Exception as e:
    print("Response text:", res.text)
