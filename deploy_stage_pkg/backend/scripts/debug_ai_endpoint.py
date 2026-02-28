import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def login(username, password):
    url = f"{BASE_URL}/token"
    data = urllib.parse.urlencode({
        "username": username,
        "password": password
    }).encode()
    
    try:
        req = urllib.request.Request(url, data=data, method="POST")
        with urllib.request.urlopen(req) as response:
            if response.getcode() == 200:
                res_body = response.read().decode()
                return json.loads(res_body)["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_ai_generate(token):
    # Construct URL with query params
    params = urllib.parse.urlencode({
        "topic": "The Solar System",
        "grade_level": "Grade 5",
        "difficulty": "Easy",
        "question_count": 3,
        "subject_id": 1,
        "class_id": 1
    })
    url = f"{BASE_URL}/teacher/assignments/ai-generate?{params}"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"Calling: {url}")
    try:
        # POST with empty body as params are in query string as per FastAPI definition
        # But wait, endpoint says `async def ... (topic: str ...)` which usually means query params if not Body()
        # Yes, standard scalar args are query params.
        req = urllib.request.Request(url, method="POST")
        for k, v in headers.items():
            req.add_header(k, v)
            
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.getcode()}")
            print(f"Response: {response.read().decode()}")
    except urllib.error.HTTPError as e:
        print(f"Request failed: {e.code} - {e.reason}")
        print(e.read().decode())
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("Logging in as teacher...")
    token = login("teacher1", "password123")
    if token:
        print("Login successful. Testing AI endpoint...")
        test_ai_generate(token)
