import sqlite3
import json
import os

# Connect to the database
# Adjust path if running from a different directory
db_path = "learnmistschool.db"
if not os.path.exists(db_path):
    print(f"Error: Database file '{db_path}' not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def print_separator(title):
    print("\n" + "="*50)
    print(f" {title}")
    print("="*50)

try:
    # 1. Inspect Users
    print_separator("USERS (Top 5)")
    cursor.execute("SELECT id, username, role, school_id FROM users LIMIT 5")
    users = cursor.fetchall()
    print(f"{'ID':<5} {'Username':<20} {'Role':<15} {'School ID'}")
    print("-" * 55)
    for u in users:
        print(f"{u[0]:<5} {u[1]:<20} {u[2]:<15} {u[3]}")

    # 2. Inspect Quizzes
    print_separator("QUIZZES")
    cursor.execute("SELECT id, title, subject, teacher_id, created_at FROM quizzes")
    quizzes = cursor.fetchall()
    if not quizzes:
        print("No quizzes found.")
    else:
        print(f"{'ID':<5} {'Title':<30} {'Subject':<15} {'Teacher ID'}")
        print("-" * 65)
        for q in quizzes:
            print(f"{q[0]:<5} {q[1]:<30} {q[2]:<15} {q[3]}")

    # 3. Inspect Assignments
    print_separator("ASSIGNMENTS")
    cursor.execute("SELECT id, title, class_id, quiz_id, status FROM assignments")
    assignments = cursor.fetchall()
    if not assignments:
        print("No assignments found.")
    else:
        print(f"{'ID':<5} {'Title':<30} {'Class ID':<10} {'Quiz ID':<10} {'Status'}")
        print("-" * 75)
        for a in assignments:
            print(f"{a[0]:<5} {a[1]:<30} {a[2]:<10} {a[3]:<10} {a[4]}")

except sqlite3.Error as e:
    print(f"Database error: {e}")
finally:
    conn.close()
