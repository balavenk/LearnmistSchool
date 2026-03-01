from app import models, schemas
import bcrypt
from datetime import datetime, timedelta

# Helper to hash passwords
def hash_pw(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# --- Initial Mock Data Lists ---

# 1. Schools
SCHOOLS = [
    models.School(id=1, name="Learnmist Academy", address="123 Tech Lane", active=True, max_teachers=50, max_students=500, max_classes=20),
    models.School(id=2, name="Global Future School", address="456 Innovation Blvd", active=True, max_teachers=100, max_students=1000, max_classes=50),
]

# 2. Users (Super Admin, School Admins, Teachers, Students)
USERS = [
    # Super Admin
    models.User(id=1, username="superadmin", email="super@admin.com", hashed_password=hash_pw("password123"), role=models.UserRole.SUPER_ADMIN, active=True),
    
    # School Admins
    models.User(id=2, username="schooladmin1", email="admin@learnmist.com", hashed_password=hash_pw("password123"), role=models.UserRole.SCHOOL_ADMIN, school_id=1, active=True),
    models.User(id=3, username="schooladmin2", email="admin@global.com", hashed_password=hash_pw("password123"), role=models.UserRole.SCHOOL_ADMIN, school_id=2, active=True),
    
    # Teachers (School 1)
    models.User(id=4, username="mr_smith", email="smith@learnmist.com", hashed_password=hash_pw("password123"), role=models.UserRole.TEACHER, school_id=1, active=True),
    models.User(id=5, username="ms_jones", email="jones@learnmist.com", hashed_password=hash_pw("password123"), role=models.UserRole.TEACHER, school_id=1, active=True),
    
    # Teachers (School 2)
    models.User(id=6, username="dr_brown", email="brown@global.com", hashed_password=hash_pw("password123"), role=models.UserRole.TEACHER, school_id=2, active=True),
    
    # Students (School 1) - These are User accounts for login
    models.User(id=7, username="student1", email="student1@learnmist.com", hashed_password=hash_pw("password123"), role=models.UserRole.STUDENT, school_id=1, active=True),
    models.User(id=8, username="student2", email="student2@learnmist.com", hashed_password=hash_pw("password123"), role=models.UserRole.STUDENT, school_id=1, active=True),
]

# 3. Grades
GRADES = [
    models.Grade(id=1, name="Grade 9", school_id=1),
    models.Grade(id=2, name="Grade 10", school_id=1),
    models.Grade(id=3, name="Grade 11", school_id=2),
]

# 4. Subjects
SUBJECTS = [
    models.Subject(id=1, name="Mathematics", school_id=1),
    models.Subject(id=2, name="Physics", school_id=1),
    models.Subject(id=3, name="History", school_id=1),
]

# 5. Classes
CLASSES = [
    models.Class(id=1, name="9-A", section="A", grade_id=1, school_id=1, class_teacher_id=4),
    models.Class(id=2, name="10-B", section="B", grade_id=2, school_id=1, class_teacher_id=5),
]

# 6. Students (Profiles linked to Users)
STUDENTS_PROFILES = [
    models.Student(id=1, name="student1", grade_id=1, class_id=1, school_id=1, active=True), # Linked to class 9-A
    models.Student(id=2, name="student2", grade_id=2, class_id=2, school_id=1, active=True), # Linked to class 10-B
]

# 7. Assignments
ASSIGNMENTS = [
    models.Assignment(
        id=1, 
        title="Algebra Intro", 
        description="Solve chapter 1 exercises.", 
        due_date=datetime.now() + timedelta(days=7), 
        status=models.AssignmentStatus.PUBLISHED, 
        teacher_id=4, 
        class_id=1, 
        subject_id=1
    ),
    models.Assignment(
        id=2, 
        title="Physics Lab Report", 
        description="Submit report on gravity.", 
        due_date=datetime.now() + timedelta(days=3), 
        status=models.AssignmentStatus.PUBLISHED, 
        teacher_id=4, 
        class_id=1, 
        subject_id=2
    ),
]

# 8. Submissions
SUBMISSIONS = [
    models.Submission(
        id=1,
        assignment_id=1,
        student_id=1,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now() - timedelta(hours=2)
    )
]

# --- Helper Functions to Simulate DB ---

def get_next_id(collection):
    if not collection:
        return 1
    return max(item.id for item in collection) + 1

