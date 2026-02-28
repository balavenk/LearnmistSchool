import requests

def test_api_login():
    url = "http://127.0.0.1:8000/token"
    payload = {
        "username": "superadmin",
        "password": "password123"
    }
    try:
        response = requests.post(url, data=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api_login()
