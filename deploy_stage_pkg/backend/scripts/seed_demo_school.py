from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
import random

db: Session = SessionLocal()

def seed_demo_school():
    print("Seeding Learnmist Demo School...")

    # 1. Fetch Dependencies
    india = db.query(models.Country).filter(models.Country.name == "India").first()
    if not india:
        print("Error: Country 'India' not found. Run seed_master_data.py first.")
        return

    cbse = db.query(models.Curriculum).filter(models.Curriculum.name == "CBSE", models.Curriculum.country_id == india.id).first()
    if not cbse:
         # Fallback or create? Assuming master data exists.
         print("Error: Curriculum 'CBSE' for India not found.")
         return

    high_school = db.query(models.SchoolType).filter(models.SchoolType.name == "High School", models.SchoolType.country_id == india.id).first()
    if not high_school:
        print("Error: School Type 'High School' for India not found.")
        return

    school_name = "Learnmist Demo School"
    
    # Random India Address
    streets = ["Gandhi MG Road", "Anna Salai", "Brigade Road", "Park Street", "Connaught Place"]
    cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad"]
    states = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal", "Telangana"]
    pincode = random.randint(110000, 700000)
    
    address = f"{random.randint(1, 100)}, {random.choice(streets)}, {random.choice(cities)}, {random.choice(states)} - {pincode}, India"

    # 2. Check Exists
    existing = db.query(models.School).filter(models.School.name == school_name).first()
    if existing:
        print(f"School '{school_name}' exists. Updating...")
        existing.address = address
        existing.country_id = india.id
        existing.curriculum_id = cbse.id
        existing.school_type_id = high_school.id
        db.commit()
        print(f"Successfully updated '{school_name}' with address: {address}")
        return

    # 3. Create
    new_school = models.School(
        name=school_name,
        address=address,
        max_teachers=100,
        max_students=1000,
        max_classes=50,
        active=True,
        country_id=india.id,
        curriculum_id=cbse.id,
        school_type_id=high_school.id
    )
    db.add(new_school)
    db.commit()
    print(f"Successfully created '{school_name}' with address: {address}")

if __name__ == "__main__":
    seed_demo_school()
