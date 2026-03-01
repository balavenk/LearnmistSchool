import sqlite3
import os

DB_PATH = "learnmistschool.db"

def seed_individual_school():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Checking for 'Individual' school...")
    
    # Check if exists
    cursor.execute("SELECT id FROM schools WHERE name = 'Individual'")
    school = cursor.fetchone()
    
    if school:
        print(f"'Individual' school already exists with ID: {school[0]}")
    else:
        print("Creating 'Individual' school...")
        # Need country_id, curriculum_id, school_type_id first. Assuming ID 1 exists for these or mock them.
        # Let's check for defaults
        cursor.execute("SELECT id FROM countries LIMIT 1")
        country = cursor.fetchone()
        country_id = country[0] if country else 1
        
        cursor.execute("SELECT id FROM curriculums LIMIT 1")
        curriculum = cursor.fetchone()
        curriculum_id = curriculum[0] if curriculum else 1
        
        cursor.execute("SELECT id FROM school_types LIMIT 1")
        school_type = cursor.fetchone()
        school_type_id = school_type[0] if school_type else 1
        
        cursor.execute("""
            INSERT INTO schools (name, address, country_id, curriculum_id, school_type_id, active, max_students, max_teachers, max_classes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("Individual", "Online", country_id, curriculum_id, school_type_id, 1, 100000, 1000, 1000))
        
        conn.commit()
        print(f"'Individual' school created with ID: {cursor.lastrowid}")
        
    conn.close()

if __name__ == "__main__":
    seed_individual_school()
