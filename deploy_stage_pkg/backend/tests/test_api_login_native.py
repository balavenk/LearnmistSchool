import http.client
import urllib.parse
import json

def test_login():
    conn = http.client.HTTPConnection("127.0.0.1", 8000)
    payload = urllib.parse.urlencode({
        'username': 'superadmin',
        'password': 'password123'
    })
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    print("Sending POST /token...")
    try:
        conn.request("POST", "/token", payload, headers)
        res = conn.getresponse()
        data = res.read()
        print(f"Status: {res.status}")
        print(f"Data: {data.decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
