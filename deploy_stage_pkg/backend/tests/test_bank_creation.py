import requests
import json
import sqlite3
import os

DB_PATH = "learnmistschool.db"
BASE_URL = "http://localhost:8000"

# Mock IDs
TEACHER_ID = 4 # teacher1
SCHOOL_ID = 1
CLASS_ID = 1
SUBJECT_ID = 1

def get_teacher_token():
    # Login as teacher1
    resp = requests.post(f"{BASE_URL}/token", data={"username": "teacher1", "password": "password123"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return None
    return resp.json()["access_token"]

def verify_creation():
    token = get_teacher_token()
    if not token: return

    # 1. Get existing questions to select from
    headers = {"Authorization": f"Bearer {token}"}
    q_resp = requests.get(f"{BASE_URL}/teacher/questions/", headers=headers, params={"class_id": CLASS_ID, "subject_id": SUBJECT_ID})
    if q_resp.status_code != 200:
        print(f"Failed to fetch questions: {q_resp.text}")
        return
    
    questions = q_resp.json()
    if not questions:
        print("No questions found to test with.")
        return
        
    selected_ids = [q['id'] for q in questions[:2]] # Select first 2
    if not selected_ids:
        print("Not enough questions.")
        return

    print(f"Selected Question IDs: {selected_ids}")

    # 2. Create Assignment from Bank
    payload = {
        "title": "Test from Bank",
        "description": "Auto generated",
        "due_date": None,
        "class_id": CLASS_ID,
        "subject_id": SUBJECT_ID,
        "question_ids": selected_ids
    }
    
    create_resp = requests.post(f"{BASE_URL}/teacher/assignments/from-bank", json=payload, headers=headers)
    if create_resp.status_code != 200:
        print(f"Creation failed: {create_resp.text}")
        return

    new_assignment = create_resp.json()
    new_id = new_assignment['id']
    print(f"Created Assignment ID: {new_id}")

    # 3. Verify Database Lineage
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(f"SELECT id, parent_question_id, text FROM questions WHERE assignment_id = {new_id}")
    new_questions = cursor.fetchall()
    
    print("\nNew Questions Verification:")
    for nq in new_questions:
        print(f"ID: {nq[0]}, ParentID: {nq[1]}")
        if nq[1] not in selected_ids:
            print(f"FAIL: ParentID {nq[1]} not in selected {selected_ids}")
        else:
            print("PASS: Lineage correct.")
            
    conn.close()

if __name__ == "__main__":
    verify_creation()
