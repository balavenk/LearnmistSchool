import requests
import sqlite3
import time
import sys

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = "learnmistschool.db"

def test_gen():
    # 1. Login as Teacher
    # Assuming 'teacher1' exists with 'password123' from seed. If not, we might fail login.
    # checking list_users.py might help, or we can use admin to creating one?
    # Let's try 'teacher1'. If fails, we might need to find a teacher.
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/token", data={"username": "teacher1", "password": "password123"})
    if resp.status_code != 200:
        print(f"Login Failed: {resp.text}")
        # Try 'schooladmin' to see if we can create one or is it just wrong creds
        # Or try default seed teacher 'teacher'
        resp = requests.post(f"{BASE_URL}/token", data={"username": "teacher", "password": "password123"})
        if resp.status_code != 200:
             print("Login as 'teacher' failed too.")
             return
    
    token = resp.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    print("Login Success.")

    # 2. Get necessary IDs (Subject, Class)
    # Teacher needs to be assigned to a class? Or just exist?
    # Let's list classes.
    # Note: Teacher endpoint might restrict to assigned classes.
    # Let's try creating a dummy class or using existing.
    
    # Actually, let's look at the DB for a valid class/subject/teacher combo to use.
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Find a teacher
    cursor.execute("SELECT id, username, school_id FROM users WHERE role='TEACHER' LIMIT 1")
    teacher = cursor.fetchone()
    if not teacher:
        print("No teacher found in DB.")
        return
    teacher_id, teacher_username, school_id = teacher
    print(f"Using Teacher: {teacher_username} (ID: {teacher_id}, School: {school_id})")
    
    # We need a token for THIS teacher.
    # If we logged in as 'teacher'/'teacher1' and it matches fine. 
    # If not, we can't easily impersonate without password.
    # I'll Assume 'teacher1' corresponds to the first teacher or we can reset password? 
    # Too risky.
    # Let's assume the login above worked for 'teacher1' or 'teacher'.
    
    # Find Subject and Class
    cursor.execute(f"SELECT id FROM subjects WHERE school_id={school_id} LIMIT 1")
    subj = cursor.fetchone()
    subject_id = subj[0] if subj else 1
    
    cursor.execute(f"SELECT id FROM classes WHERE school_id={school_id} LIMIT 1")
    cls = cursor.fetchone()
    class_id = cls[0] if cls else 1
    
    conn.close()
    
    print(f"Testing with Subject: {subject_id}, Class: {class_id}")
    
    # 3. Call Generate API
    params = {
        "topic": "Test Topic",
        "grade_level": "Grade 10",
        "difficulty": "Easy",
        "question_count": 2,
        "subject_id": subject_id,
        "class_id": class_id
        # due_date optional
    }
    
    print("Calling /teacher/assignments/ai-generate...")
    try:
        gen_resp = requests.post(f"{BASE_URL}/teacher/assignments/ai-generate", params=params, headers=headers)
        if gen_resp.status_code != 200:
            print(f"Generation Failed: {gen_resp.status_code} {gen_resp.text}")
            return
            
        assignment = gen_resp.json()
        print(f"Assignment Created: ID {assignment['id']}")
        
        # 4. Verify DB
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(f"SELECT id, text, school_id, subject_id, class_id FROM questions WHERE assignment_id={assignment['id']}")
        rows = cursor.fetchall()
        
        print("\n--- DB Verification ---")
        all_good = True
        for row in rows:
            qid, txt, sch, sub, cl = row
            print(f"QID: {qid} | School: {sch} | Subject: {sub} | Class: {cl}")
            
            if sch is None or sub is None or cl is None:
                all_good = False
                print(">>> ERROR: Context Field is NULL")
            if sch != school_id:
                print(f">>> ERROR: School ID mismatch (Expected {school_id}, Got {sch})")
        
        if all_good and rows:
            print("\nSUCCESS: All questions have valid context fields.")
        elif not rows:
            print("ERROR: No questions found in DB for this assignment.")
        else:
            print("\nFAILURE: Some fields are missing or incorrect.")
            
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Wait for server restart
    time.sleep(5) 
    test_gen()
