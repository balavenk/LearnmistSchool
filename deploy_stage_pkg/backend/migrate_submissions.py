import sqlite3

def migrate_db():
    conn = sqlite3.connect('backend/learnmistschool.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    print("Starting DB migration for PENDING submissions...")

    # Fetch all PUBLISHED assignments
    c.execute("SELECT id, class_id FROM assignments WHERE status = 'PUBLISHED'")
    assignments = c.fetchall()

    inserted_count = 0
    for assignment in assignments:
        assignment_id = assignment['id']
        class_id = assignment['class_id']

        # Find eligible students
        # Eligible students: either specifically in the class_id, OR in the grade_id if class_id is None
        if class_id:
            c.execute("SELECT id FROM students WHERE class_id = ?", (class_id,))
        else:
             continue # Assignment has no valid target
             
        students = c.fetchall()
        for student in students:
            student_id = student['id']
            # Check if submission already exists
            c.execute("SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?", (assignment_id, student_id))
            if not c.fetchone():
                c.execute("INSERT INTO submissions (assignment_id, student_id, status) VALUES (?, ?, 'PENDING')", (assignment_id, student_id))
                inserted_count += 1
                print(f"Inserted PENDING submission for student {student_id}, assignment {assignment_id}")

    conn.commit()
    conn.close()
    print(f"Migration complete. Inserted {inserted_count} missing PENDING submissions.")

if __name__ == '__main__':
    migrate_db()
