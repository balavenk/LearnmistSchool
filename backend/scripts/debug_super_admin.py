import urllib.request
import urllib.parse
import json
import traceback

BASE_URL = "http://localhost:8000"

def login(username, password):
    url = f"{BASE_URL}/token"
    # urlencode handles special characters in password if any, but simplistic here
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
        try:
             print(e.read().decode())
        except:
             pass
        return None

def get_materials(token):
    url = f"{BASE_URL}/upload/all-training-materials"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Success! Got {len(data)} items.")
            for item in data:
                print(f"- ID: {item.get('id')} | File: {item['original_filename']} | Status: {item.get('file_status')} | Subject: {item.get('subject_name')} | Grade: {item.get('grade_name')} | School: {item.get('school_name')}")
            return data
    except Exception as e:
        print(f"Fetch failed: {e}")
        try:
            print(e.read().decode())
        except:
            pass

if __name__ == "__main__":
    print("Logging in as superadmin...")
    token = login("superadmin", "password123")
    if token:
        print("Logged in. Fetching materials...")
        get_materials(token)
    else:
        print("Could not log in.")
