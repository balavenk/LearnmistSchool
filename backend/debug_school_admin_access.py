import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000"

def login(username, password):
    url = f"{BASE_URL}/token"
    data = urllib.parse.urlencode({
        "username": username,
        "password": password
    }).encode()
    
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_json = json.loads(response.read().decode())
            return res_json["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def get_materials_as_school_admin(token):
    url = f"{BASE_URL}/upload/all-training-materials"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Success! Got {len(data)} items.")
    except urllib.error.HTTPError as e:
        print(f"Fetch failed as expected: {e.code} {e.reason}")
        if e.code == 403:
            print("CONFIRMED: School Admin cannot access this endpoint.")
    except Exception as e:
        print(f"Fetch failed with unexpected error: {e}")

if __name__ == "__main__":
    print("Logging in as schooladmin...")
    # Assuming schooladmin/password123 exists from seed or previous context
    token = login("school_admin", "password123") 
    if not token:
         # Try 'admin' just in case seed used generic name
         token = login("admin", "password123")

    if token:
        print("Logged in. Attempting to fetch all materials...")
        get_materials_as_school_admin(token)
    else:
        print("Could not log in as school admin.")
