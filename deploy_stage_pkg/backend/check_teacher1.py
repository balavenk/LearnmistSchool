import sqlite3

c = sqlite3.connect('/home/balav/app/backend/learnmistschool.db')
print("TEACHER ASSIGNMENTS")
for row in c.execute('SELECT * FROM teacher_assignments WHERE teacher_id=3').fetchall():
    print(row)
print("CLASS")
for row in c.execute('SELECT * FROM classes WHERE id=1').fetchall():
    print(row)
print("GRADE SUBJECTS")
for row in c.execute('SELECT * FROM grade_subjects').fetchall():
    print(row)
