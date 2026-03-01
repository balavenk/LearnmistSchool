import sqlite3
import urllib.request
import urllib.parse
import json
import os

# Configuration
DB_PATH = r"backend\learnmistschool.db"
API_URL = "http://127.0.0.1:8000/token"

def set_user_active_status(username, status):
    print(f"Setting user {username} active status to {status}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET active = ? WHERE username = ?", (1 if status else 0, username))
    conn.commit()
    conn.close()

def attempt_login(username, password):
    print(f"Attempting login for {username}...")
    data = urllib.parse.urlencode({
        "username": username,
        "password": password
    }).encode()
    
    req = urllib.request.Request(API_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.status
            body = json.loads(response.read().decode('utf-8'))
            return status_code, body
    except urllib.error.HTTPError as e:
        status_code = e.code
        body = json.loads(e.read().decode('utf-8'))
        return status_code, body
    except Exception as e:
        return None, str(e)

def main():
    # We assume 'superadmin' exists and has password 'password123' based on existing tests
    username = "superadmin"
    password = "password123"

    # 1. Test Active Login
    set_user_active_status(username, True)
    status_code, response = attempt_login(username, password)
    print(f"Active Login Result: {status_code}, {response}")
    if status_code != 200:
        print("FAIL: Active user should be able to log in.")
        return

    # 2. Test Inactive Login
    set_user_active_status(username, False)
    status_code, response = attempt_login(username, password)
    print(f"Inactive Login Result: {status_code}, {response}")
    
    if status_code == 401 and response.get("detail") == "Inactive user":
        print("SUCCESS: Inactive user login blocked correctly.")
    else:
        print(f"FAIL: Inactive user should be blocked with 401 'Inactive user'. Got {status_code}")

    # 3. Restore status
    set_user_active_status(username, True)

if __name__ == "__main__":
    main()
