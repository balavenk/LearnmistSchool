import urllib.request

url = "http://127.0.0.1:8000/"
try:
    with urllib.request.urlopen(url, timeout=5) as response:
        print(f"Status: {response.status}")
        print(f"Body: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
