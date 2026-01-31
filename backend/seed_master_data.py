from sqlalchemy.orm import Session
from database import SessionLocal
import models

db: Session = SessionLocal()

def seed_master_data():
    print("Seeding Master Data...")
    
    # Countries
    countries_data = ["India", "USA"]
    countries = {}
    for c_name in countries_data:
        c = db.query(models.Country).filter(models.Country.name == c_name).first()
        if not c:
            c = models.Country(name=c_name)
            db.add(c)
            db.commit()
            db.refresh(c)
            print(f"Created Country: {c_name}")
        countries[c_name] = c

    # India Data
    india = countries["India"]
    
    # Curriculums for India
    curriculums = ["CBSE", "Matriculation"]
    for curr_name in curriculums:
        exists = db.query(models.Curriculum).filter(models.Curriculum.name == curr_name, models.Curriculum.country_id == india.id).first()
        if not exists:
            db.add(models.Curriculum(name=curr_name, country_id=india.id))
            print(f"Created Curriculum: {curr_name} for India")

    # School Types for India
    types = ["Primary", "High School", "Higher Secondary"]
    for t_name in types:
        exists = db.query(models.SchoolType).filter(models.SchoolType.name == t_name, models.SchoolType.country_id == india.id).first()
        if not exists:
            db.add(models.SchoolType(name=t_name, country_id=india.id))
            print(f"Created School Type: {t_name} for India")

    db.commit()
    print("Seeding Complete.")

if __name__ == "__main__":
    seed_master_data()
