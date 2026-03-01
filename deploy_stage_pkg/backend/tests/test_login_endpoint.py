import urllib.request
import urllib.parse
import json

url = "http://127.0.0.1:8000/token"
data = urllib.parse.urlencode({
    "username": "superadmin",
    "password": "password123"
}).encode()

req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Content-Type", "application/x-www-form-urlencoded")

try:
    print(f"Sending POST to {url}...")
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        print(f"Response Body: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print(f"Error Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
