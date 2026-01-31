from sqlalchemy.orm import Session
from database import SessionLocal
import models
from auth import get_password_hash
import re

db: Session = SessionLocal()

def create_student_logins():
    students = db.query(models.Student).all()
    hashed_default_pw = get_password_hash("password123")
    
    created_logins = []
    
    print(f"Found {len(students)} students. Processing...")
    
    for student in students:
        if student.user_id:
            # Already has a login?
            # Check if user exists
            user = db.query(models.User).filter(models.User.id == student.user_id).first()
            if user:
                # print(f"Student {student.name} already has login: {user.username}")
                continue # Skip or update? Skip for now.
        
        # Generate Username
        # Split name
        parts = student.name.split()
        if len(parts) >= 1:
            firstname = parts[0].lower()
            if len(parts) > 1:
                last_initial = parts[-1][0].lower()
                base_username = f"{firstname}{last_initial}"
            else:
                base_username = firstname
        else:
            base_username = f"student{student.id}"
            
        # Clean username (alphanumeric only)
        base_username = re.sub(r'[^a-z0-9]', '', base_username)
        
        # Ensure Uniqueness
        username = base_username
        counter = 1
        while True:
            existing = db.query(models.User).filter(models.User.username == username).first()
            if not existing:
                break
            username = f"{base_username}{counter}"
            counter += 1
            
        # Create User
        new_user = models.User(
            username=username,
            email=f"{username}@student.learnmistschool.com", # Fake email
            hashed_password=hashed_default_pw,
            role=models.UserRole.STUDENT,
            active=True,
            school_id=student.school_id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Link to Student
        student.user_id = new_user.id
        db.commit()
        
        created_logins.append({
            "name": student.name,
            "username": username,
            "password": "password123",
            "school_id": student.school_id
        })
        
    print(f"\n--- Created {len(created_logins)} Logins ---\n")
    print(f"{'Student Name':<30} | {'Username':<20} | {'Password':<15}")
    print("-" * 70)
    for login in created_logins:
        print(f"{login['name']:<30} | {login['username']:<20} | {login['password']:<15}")

if __name__ == "__main__":
    create_student_logins()
