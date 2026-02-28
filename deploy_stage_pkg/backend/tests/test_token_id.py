import requests

def test_token():
    url = "http://127.0.0.1:8000/token"
    # Assuming 'teacher1' exists with 'password123' (standard test creds)
    data = {
        "username": "teacher1",
        "password": "password123"
    }
    try:
        response = requests.post(url, data=data)
        if response.status_code == 200:
            token_data = response.json()
            if "id" in token_data:
                print(f"SUCCESS: Token response contains id: {token_data['id']}")
            else:
                print("FAILURE: Token response MISSING id")
                print(token_data)
        else:
            print(f"Login Failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_token()
