from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas, auth

router = APIRouter(
    prefix="/super-admin",
    tags=["super-admin"],
    responses={404: {"description": "Not found"}},
)

# Dependency to check if user is SUPER_ADMIN
def get_current_super_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


@router.get("/stats", response_model=schemas.SuperAdminStats)
def get_dashboard_stats(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    total_schools = db.query(models.School).count()
    
    # Active Users = Active Students + Active Users (Teachers + Admins)
    # Note: Super Admin is also a user but usually not counted as "School User"
    # But for "System Users" count, we can include everyone.
    
    total_students = db.query(models.Student).filter(models.Student.active == True).count()
    total_users = db.query(models.User).filter(models.User.active == True).count()
    
    recent_schools = db.query(models.School).order_by(models.School.id.desc()).limit(5).all()
    
    # Need to populate extra specific fields for schools if required by School schema? 
    # School schema has 'student_count' and 'teacher_count' as optional.
    # We can skip expensive counts for the dashboard list if not displayed.
    
    return {
        "total_schools": total_schools,
        "active_users": total_students + total_users,
        "recent_schools": recent_schools
    }


@router.post("/schools/", response_model=schemas.School)
def create_school(school: schemas.SchoolCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Check if exists in DB
    existing_school = db.query(models.School).filter(models.School.name == school.name).first()
    if existing_school:
        raise HTTPException(status_code=400, detail="School with this name already exists")
        
    new_school = models.School(
        name=school.name,
        address=school.address,
        max_teachers=school.max_teachers,
        max_students=school.max_students,
        max_classes=school.max_classes,
        country_id=school.country_id,
        curriculum_id=school.curriculum_id,
        school_type_id=school.school_type_id,
        active=True
    )
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school

@router.get("/schools/", response_model=List[schemas.School])
def read_schools(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    schools = db.query(models.School).offset(skip).limit(limit).all()
    results = []
    for school in schools:
        student_count = db.query(models.Student).filter(models.Student.school_id == school.id).count()
        teacher_count = db.query(models.User).filter(models.User.school_id == school.id, models.User.role == models.UserRole.TEACHER).count()
        
        # We need to convert SQLAlchemy model to Pydantic model manually or attach attributes if using ORM mode with extra fields
        # Pydantic's from_attributes usually picks up properties. Let's attach them to the object instance if possible (Python dynamic)
        # However, it's cleaner to just create a dictionary or update the object if it wasn't a DB model.
        # Since school is a DB model instance, we can't easily add arbitrary attributes that aren't columns without ignoring them in SQL.
        # But we can reconstruct the Pydantic model.
        
        school_data = schemas.School.model_validate(school) 
        school_data.student_count = student_count
        school_data.teacher_count = teacher_count
        results.append(school_data)
        
    return results

@router.post("/schools/{school_id}/admin", response_model=schemas.User)
def create_school_admin(school_id: int, user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Verify school exists
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Verify user unique
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=models.UserRole.SCHOOL_ADMIN,
        school_id=school_id,
        active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/schools/{school_id}/users", response_model=List[schemas.User])
def read_school_users(school_id: int, role: models.UserRole = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Verify school exists
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    query = db.query(models.User).filter(models.User.school_id == school_id)
    if role:
        query = query.filter(models.User.role == role)
    
    # Also fetch students if role is STUDENT or generic?
    # Wait, models.User is for Users (School Admin, Teacher). Students are in models.Student.
    # The frontend expects a unified list or tabs?
    # Frontend tabs: SCHOOL_ADMIN, TEACHER, STUDENT.
    # If role is STUDENT, we need to query models.Student, NOT models.User.
    
    if role == models.UserRole.STUDENT:
        # Pydantic schema for User might not match Student exactly?
        # User schema has username, email, role. Student has name, grade_id, class_id.
        # Frontend 'MockUser' has common fields.
        # We might need separate endpoints or a unified response?
        # Let's stick to returning User models for now. 
        # But Students are NOT in User table.
        # We need to handle this.
        return [] 
        
    return query.all()

@router.get("/schools/{school_id}/students", response_model=List[schemas.Student])
def read_school_students(school_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
     school = db.query(models.School).filter(models.School.id == school_id).first()
     if not school:
        raise HTTPException(status_code=404, detail="School not found")
     return db.query(models.Student).filter(models.Student.school_id == school_id).all()

# Master Data Endpoints

@router.get("/master/countries", response_model=List[schemas.Country])
def read_countries(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    return db.query(models.Country).all()

@router.post("/master/countries", response_model=schemas.Country)
def create_country(country: schemas.CountryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    existing = db.query(models.Country).filter(models.Country.name == country.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Country already exists")
    
    new_country = models.Country(name=country.name)
    db.add(new_country)
    db.commit()
    db.refresh(new_country)
    return new_country

@router.put("/master/countries/{country_id}", response_model=schemas.Country)
def update_country(country_id: int, country: schemas.CountryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_country = db.query(models.Country).filter(models.Country.id == country_id).first()
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    # Check name uniqueness if changing name
    if db_country.name != country.name:
        existing = db.query(models.Country).filter(models.Country.name == country.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Country name already taken")
    
    db_country.name = country.name
    db.commit()
    db.refresh(db_country)
    return db_country

@router.delete("/master/countries/{country_id}")
def delete_country(country_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_country = db.query(models.Country).filter(models.Country.id == country_id).first()
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
        
    # Check if used
    if db_country.schools: 
        raise HTTPException(status_code=400, detail="Cannot delete country in use by schools")
    
    db.delete(db_country)
    db.commit()
    return {"message": "Country deleted successfully"}

@router.get("/master/curriculums", response_model=List[schemas.Curriculum])
def read_curriculums(country_id: int = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    query = db.query(models.Curriculum)
    if country_id:
        query = query.filter(models.Curriculum.country_id == country_id)
    return query.all()

@router.post("/master/curriculums", response_model=schemas.Curriculum)
def create_curriculum(curriculum: schemas.CurriculumCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Verify country exists
    country = db.query(models.Country).filter(models.Country.id == curriculum.country_id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    existing = db.query(models.Curriculum).filter(
        models.Curriculum.name == curriculum.name,
        models.Curriculum.country_id == curriculum.country_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Curriculum already exists for this country")
    
    new_curriculum = models.Curriculum(name=curriculum.name, country_id=curriculum.country_id)
    db.add(new_curriculum)
    db.commit()
    db.refresh(new_curriculum)
    return new_curriculum

@router.put("/master/curriculums/{curriculum_id}", response_model=schemas.Curriculum)
def update_curriculum(curriculum_id: int, curriculum: schemas.CurriculumCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_obj = db.query(models.Curriculum).filter(models.Curriculum.id == curriculum_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    
    # Verify country exists
    country = db.query(models.Country).filter(models.Country.id == curriculum.country_id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
        
    # Check uniqueness
    if db_obj.name != curriculum.name or db_obj.country_id != curriculum.country_id:
        existing = db.query(models.Curriculum).filter(
            models.Curriculum.name == curriculum.name,
            models.Curriculum.country_id == curriculum.country_id
        ).first()
        if existing:
             raise HTTPException(status_code=400, detail="Curriculum already exists for this country")

    db_obj.name = curriculum.name
    db_obj.country_id = curriculum.country_id
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/master/curriculums/{curriculum_id}")
def delete_curriculum(curriculum_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_obj = db.query(models.Curriculum).filter(models.Curriculum.id == curriculum_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Curriculum not found")
        
    # Check if used
    if db_obj.schools: 
        raise HTTPException(status_code=400, detail="Cannot delete Curriculum in use by schools")
    
    db.delete(db_obj)
    db.commit()
    return {"message": "Curriculum deleted successfully"}

@router.get("/master/school-types", response_model=List[schemas.SchoolType])
def read_school_types(country_id: int = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    query = db.query(models.SchoolType)
    if country_id:
        query = query.filter(models.SchoolType.country_id == country_id)
    return query.all()

@router.post("/master/school-types", response_model=schemas.SchoolType)
def create_school_type(school_type: schemas.SchoolTypeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Verify country exists
    country = db.query(models.Country).filter(models.Country.id == school_type.country_id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    existing = db.query(models.SchoolType).filter(
        models.SchoolType.name == school_type.name,
        models.SchoolType.country_id == school_type.country_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="School Type already exists for this country")
    
    new_type = models.SchoolType(name=school_type.name, country_id=school_type.country_id)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type

@router.put("/master/school-types/{type_id}", response_model=schemas.SchoolType)
def update_school_type(type_id: int, school_type: schemas.SchoolTypeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_obj = db.query(models.SchoolType).filter(models.SchoolType.id == type_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="School Type not found")
    
    # Verify country exists
    country = db.query(models.Country).filter(models.Country.id == school_type.country_id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
        
    # Check uniqueness
    if db_obj.name != school_type.name or db_obj.country_id != school_type.country_id:
        existing = db.query(models.SchoolType).filter(
            models.SchoolType.name == school_type.name,
            models.SchoolType.country_id == school_type.country_id
        ).first()
        if existing:
             raise HTTPException(status_code=400, detail="School Type already exists for this country")

    db_obj.name = school_type.name
    db_obj.country_id = school_type.country_id
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/master/school-types/{type_id}")
def delete_school_type(type_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_obj = db.query(models.SchoolType).filter(models.SchoolType.id == type_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="School Type not found")
        
    # Check if used
    if db_obj.schools: 
        raise HTTPException(status_code=400, detail="Cannot delete School Type in use by schools")
    
    db.delete(db_obj)
    db.commit()
    return {"message": "School Type deleted successfully"}

