import sqlite3
import pprint

conn = sqlite3.connect('backend/learnmistschool.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("--- Students ---")
c.execute("SELECT id, name, class_id, grade_id FROM students WHERE name LIKE '%David%'")
students = [dict(row) for row in c.fetchall()]
for s in students:
    print(s)

print("\n--- Classes ---")
class_ids = [s['class_id'] for s in students if s['class_id']]
if class_ids:
    c.execute(f"SELECT * FROM classes WHERE id IN ({','.join('?' for _ in class_ids)})", class_ids)
    for row in c.fetchall():
        print(dict(row))

print("\n--- Assignments Info ---")
c.execute("SELECT id, title FROM assignments WHERE id IN (1, 2)")
for row in c.fetchall():
    assignment_id = row['id']
    title = row['title']
    c.execute("SELECT count(*) as c FROM questions WHERE assignment_id=?", (assignment_id,))
    q_count = c.fetchone()['c']
    c.execute("SELECT id, status FROM submissions WHERE assignment_id=? AND student_id=1", (assignment_id,))
    sub = c.fetchone()
    sub_status = sub['status'] if sub else 'None'
    print(f"ID: {assignment_id}, Title: {title}, Questions: {q_count}, Submission Status: {sub_status}")

print("\n--- All Assignments assigned to Teacher 4 (teacher1 assumed) ---")
c.execute("SELECT id, title, status, class_id, teacher_id FROM assignments")
for row in c.fetchall():
    print(dict(row))
