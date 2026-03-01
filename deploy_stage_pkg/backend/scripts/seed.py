from app import database, models, auth
from sqlalchemy.orm import Session

def seed():
    db = database.SessionLocal()
    try:
        password = "password123"
        hashed_pwd = auth.get_password_hash(password)

        # 1. Create Super Admin
        super_admin = db.query(models.User).filter(models.User.username == "superadmin").first()
        if not super_admin:
            super_admin = models.User(
                username="superadmin",
                email="superadmin@learnmist.com", 
                hashed_password=hashed_pwd, 
                role=models.UserRole.SUPER_ADMIN, 
                school_id=None
            )
            db.add(super_admin)
            print("Created Super Admin: superadmin / password123")
        else:
            print("Super Admin already exists")

        # 2. Create School
        school = db.query(models.School).filter(models.School.name == "Learnmist Demo School").first()
        if not school:
            school = models.School(
                name="Learnmist Demo School",
                address="123 Education Lane, Tech City",
                max_teachers=10,
                max_students=100,
                max_classes=5
            )
            db.add(school)
            db.commit() # Commit to get ID
            db.refresh(school)
            print(f"Created School: {school.name}")
        
        # 3. Create School Admin
        school_admin = db.query(models.User).filter(models.User.username == "schooladmin").first()
        if not school_admin:
            school_admin = models.User(
                username="schooladmin",
                email="admin@schooldemo.com",
                hashed_password=hashed_pwd, 
                role=models.UserRole.SCHOOL_ADMIN, 
                school_id=school.id
            )
            db.add(school_admin)
            print("Created School Admin: schooladmin / password123")

        # 4. Create Grade and Class
        grade = db.query(models.Grade).filter(models.Grade.name == "10", models.Grade.school_id == school.id).first()
        if not grade:
            grade = models.Grade(name="10", school_id=school.id)
            db.add(grade)
            db.commit()
            db.refresh(grade)
            print("Created Grade: 10")

        class_obj = db.query(models.Class).filter(models.Class.name == "10-A", models.Class.school_id == school.id).first()
        if not class_obj:
            class_obj = models.Class(
                name="10-A", 
                section="A", 
                grade_id=grade.id, 
                school_id=school.id
            )
            db.add(class_obj)
            db.commit()
            db.refresh(class_obj)
            print("Created Class: 10-A")

        # 5. Create Teacher
        teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
        if not teacher:
            teacher = models.User(
                username="teacher1",
                email="teacher1@schooldemo.com",
                hashed_password=hashed_pwd, 
                role=models.UserRole.TEACHER, 
                school_id=school.id
            )
            db.add(teacher)
            print("Created Teacher: teacher1 / password123")
        
        # Assign teacher to class (optional but good for testing)
        if class_obj.class_teacher_id is None and teacher:
             # Need to get teacher ID if we just created
             db.commit()
             db.refresh(teacher)
             class_obj.class_teacher_id = teacher.id 
             db.add(class_obj)
             print("Assigned Teacher to Class 10-A")
        
        db.commit()
        
        # 6. Create Student (User + Profile)
        student_user = db.query(models.User).filter(models.User.username == "student1").first()
        if not student_user:
            student_user = models.User(
                username="student1",
                email="student1@schooldemo.com",
                hashed_password=hashed_pwd, 
                role=models.UserRole.STUDENT, 
                school_id=school.id
            )
            db.add(student_user)
            print("Created Student User: student1 / password123")
        
        # Create Student Profile linked to Class
        student_profile = db.query(models.Student).filter(models.Student.name == "student1", models.Student.school_id == school.id).first()
        if not student_profile:
            student_profile = models.Student(
                name="student1", # Matching username for now as per router logic
                grade_id=grade.id,
                class_id=class_obj.id,
                school_id=school.id
            )
            db.add(student_profile)
            print("Created Student Profile for student1")
        
        db.commit()

        student_profile = db.query(models.Student).filter(models.Student.name == "student1", models.Student.school_id == school.id).first()
        if not student_profile:
            student_profile = models.Student(
                name="student1", # Matches username
                school_id=school.id,
                grade_id=grade.id,
                class_id=class_obj.id
            )
            db.add(student_profile)
            print("Created Student Profile: student1")

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
