import requests

BASE_URL = "http://127.0.0.1:8000"

# Login
login_data = {
    "username": "teacher1",
    "password": "password123"
}
response = requests.post(f"{BASE_URL}/token", data=login_data)
if response.status_code != 200:
    print("Login failed:", response.text)
    exit(1)

token = response.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

subject_id = 1
grade_id = 1

# Generate AI
payload = {
    "topic": "Solar System",
    "subject_id": subject_id,
    "grade_id": grade_id,
    "class_id": None,
    "difficulty": "Medium",
    "question_type": "Mixed",
    "question_count": 2,
    "use_pdf_context": False,
    "grade_level": "Grade 5"
}

print(f"Sending request with payload: {payload}")
resp = requests.post(f"{BASE_URL}/teacher/assignments/ai-generate", json=payload, headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.text)
