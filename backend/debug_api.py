import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app import models, schemas

db = SessionLocal()
try:
    total_schools = db.query(models.School).count()
    total_students = db.query(models.Student).filter(models.Student.active == True).count()
    total_users = db.query(models.User).filter(models.User.active == True).count()
    recent_schools_db = db.query(models.School).order_by(models.School.id.desc()).limit(5).all()
    
    recent_schools = []
    for school in recent_schools_db:
        student_count = db.query(models.Student).filter(models.Student.school_id == school.id).count()
        teacher_count = db.query(models.User).filter(models.User.school_id == school.id, models.User.role == models.UserRole.TEACHER).count()
        school_data = schemas.School.model_validate(school)
        school_data.student_count = student_count
        school_data.teacher_count = teacher_count
        recent_schools.append(school_data)
        
    total_quizzes = db.query(models.Assignment).join(models.Question).distinct().count()
    total_assignments = db.query(models.Assignment).count()
    total_projects = total_assignments - total_quizzes
    
    stats_data = {
        "total_schools": total_schools,
        "active_users": total_students + total_users,
        "total_quizzes": total_quizzes,
        "total_projects": max(0, total_projects),
        "recent_schools": recent_schools
    }
    
    print("Trying to validate schema...")
    res = schemas.SuperAdminStats(**stats_data)
    print("Schema validated successfully!")
    print(res.model_dump_json(indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
