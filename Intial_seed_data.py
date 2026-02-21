"""
Production seed script — SQLite compatible.
Run from: ~/app/backend/  with PYTHONPATH=. and venv active.
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))
from app import models, database
from app.auth import get_password_hash
def get_or_create(db, model, defaults=None, **kwargs):
    instance = db.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    params = {**kwargs, **(defaults or {})}
    instance = model(**params)
    db.add(instance)
    db.flush()
    return instance, True
def seed():
    print("Creating tables...")
    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        # ── Curricula ─────────────────────────────────────────
        for cur_name in ["CBSE", "Matriculation"]:
            cur, created = get_or_create(db, models.Curriculum, name=cur_name)
            print(f"{'✅' if created else '  '} Curriculum: {cur_name}")
        db.commit()
        # ── Demo School ───────────────────────────────────────
        school, created = get_or_create(
            db, models.School,
            defaults=dict(
                address="123 Demo Street, Chennai, Tamil Nadu, India",
                max_teachers=50, max_students=500, max_classes=20, active=True,
            ),
            name="Learnmist Demo School"
        )
        db.commit()
        db.refresh(school)
        print(f"{'✅' if created else '  '} School: {school.name} (id={school.id})")
        # ── Superadmin ────────────────────────────────────────
        su, created = get_or_create(db, models.User, username="superadmin",
            defaults=dict(
                email="superadmin@learnmist.com",
                hashed_password=get_password_hash("password123"),
                role=models.UserRole.SUPER_ADMIN, active=True,
            ))
        if not created:
            su.hashed_password = get_password_hash("password123")
        db.commit()
        print(f"{'✅' if created else '  '} Superadmin")
        # ── School Admin ──────────────────────────────────────
        sa, created = get_or_create(db, models.User, username="schooladmin",
            defaults=dict(
                email="schooladmin@learnmist.com",
                hashed_password=get_password_hash("password123"),
                role=models.UserRole.SCHOOL_ADMIN,
                school_id=school.id, active=True,
            ))
        db.commit()
        print(f"{'✅' if created else '  '} School Admin")
        # ── Teachers ──────────────────────────────────────────
        teacher1, c1 = get_or_create(db, models.User, username="teacher1",
            defaults=dict(
                email="teacher1@learnmist.com",
                hashed_password=get_password_hash("password123"),
                role=models.UserRole.TEACHER,
                school_id=school.id, active=True,
            ))
        teacher2, c2 = get_or_create(db, models.User, username="teacher2",
            defaults=dict(
                email="teacher2@learnmist.com",
                hashed_password=get_password_hash("password123"),
                role=models.UserRole.TEACHER,
                school_id=school.id, active=True,
            ))
        db.commit()
        print(f"{'✅' if c1 else '  '} teacher1")
        print(f"{'✅' if c2 else '  '} teacher2")
        # ── Subjects ──────────────────────────────────────────
        subject_data = [
            ("Chemistry",         "CHEM"),
            ("Computer Science",  "CS"),
            ("Mathematics",       "MATH"),
        ]
        subjects = {}
        for sname, scode in subject_data:
            subj, created = get_or_create(db, models.Subject,
                name=sname, school_id=school.id,
                defaults=dict(code=scode))
            subjects[sname] = subj
            print(f"{'✅' if created else '  '} Subject: {sname}")
        db.commit()
        # ── Grade 10 ──────────────────────────────────────────
        grade10, created = get_or_create(db, models.Grade,
            name="Grade 10", school_id=school.id)
        db.commit()
        db.refresh(grade10)
        print(f"{'✅' if created else '  '} Grade 10 (id={grade10.id})")
        # Link subjects to Grade 10
        for subj in subjects.values():
            if subj not in grade10.subjects:
                grade10.subjects.append(subj)
        db.commit()
        print("  ✅ Subjects linked to Grade 10")
        # ── Class Sections ────────────────────────────────────
        class10a, c = get_or_create(db, models.Class,
            name="10-A", section="A", grade_id=grade10.id, school_id=school.id,
            defaults=dict(class_teacher_id=teacher1.id))
        if not c:
            class10a.class_teacher_id = teacher1.id
        print(f"{'✅' if c else '  '} Class 10-A (teacher1)")
        class10b, c = get_or_create(db, models.Class,
            name="10-B", section="B", grade_id=grade10.id, school_id=school.id,
            defaults=dict(class_teacher_id=teacher2.id))
        if not c:
            class10b.class_teacher_id = teacher2.id
        print(f"{'✅' if c else '  '} Class 10-B (teacher2)")
        db.commit()
        db.refresh(class10a)
        db.refresh(class10b)
        # ── Teacher Assignments ───────────────────────────────
        # teacher1 → Chemistry, Grade 10, Class 10-A
        ta1 = db.query(models.TeacherAssignment).filter_by(
            teacher_id=teacher1.id,
            subject_id=subjects["Chemistry"].id,
            grade_id=grade10.id
        ).first()
        if not ta1:
            db.add(models.TeacherAssignment(
                teacher_id=teacher1.id,
                subject_id=subjects["Chemistry"].id,
                grade_id=grade10.id,
                class_id=class10a.id,
            ))
            print("✅ teacher1 → Chemistry / Grade 10 / 10-A")
        else:
            ta1.class_id = class10a.id
            print("  teacher1 → Chemistry updated with class 10-A")
        # teacher2 → Mathematics, Grade 10, Class 10-B
        ta2 = db.query(models.TeacherAssignment).filter_by(
            teacher_id=teacher2.id,
            subject_id=subjects["Mathematics"].id,
            grade_id=grade10.id
        ).first()
        if not ta2:
            db.add(models.TeacherAssignment(
                teacher_id=teacher2.id,
                subject_id=subjects["Mathematics"].id,
                grade_id=grade10.id,
                class_id=class10b.id,
            ))
            print("✅ teacher2 → Mathematics / Grade 10 / 10-B")
        else:
            ta2.class_id = class10b.id
            print("  teacher2 → Mathematics updated with class 10-B")
        db.commit()
        # ── Students in 10-A → teacher1 ──────────────────────
        for sname in ["student1", "student2"]:
            s_user, s_created = get_or_create(db, models.User, username=sname,
                defaults=dict(
                    email=f"{sname}@learnmist.com",
                    hashed_password=get_password_hash("password123"),
                    role=models.UserRole.STUDENT,
                    school_id=school.id, active=True,
                ))
            db.flush()
            s_profile = db.query(models.Student).filter_by(user_id=s_user.id).first()
            if not s_profile:
                db.add(models.Student(
                    name=sname, email=f"{sname}@learnmist.com",
                    school_id=school.id, grade_id=grade10.id,
                    class_id=class10a.id, user_id=s_user.id, active=True,
                ))
                print(f"✅ {sname} created → class 10-A / teacher1")
            else:
                s_profile.class_id = class10a.id
                print(f"  {sname} already exists — updated to 10-A")
        db.commit()
        # ── Students in 10-B → teacher2 ──────────────────────
        for sname in ["student3", "student4"]:
            s_user, s_created = get_or_create(db, models.User, username=sname,
                defaults=dict(
                    email=f"{sname}@learnmist.com",
                    hashed_password=get_password_hash("password123"),
                    role=models.UserRole.STUDENT,
                    school_id=school.id, active=True,
                ))
            db.flush()
            s_profile = db.query(models.Student).filter_by(user_id=s_user.id).first()
            if not s_profile:
                db.add(models.Student(
                    name=sname, email=f"{sname}@learnmist.com",
                    school_id=school.id, grade_id=grade10.id,
                    class_id=class10b.id, user_id=s_user.id, active=True,
                ))
                print(f"✅ {sname} created → class 10-B / teacher2")
            else:
                s_profile.class_id = class10b.id
                print(f"  {sname} already exists — updated to 10-B")
        db.commit()
        print("\n=== Credentials ===")
        print("  SuperAdmin:  superadmin  / password123")
        print("  SchoolAdmin: schooladmin / password123")
        print("  Teacher 1:   teacher1    / password123  (Chemistry, 10-A)")
        print("  Teacher 2:   teacher2    / password123  (Mathematics, 10-B)")
        print("  Student 1:   student1    / password123  (10-A)")
        print("  Student 2:   student2    / password123  (10-A)")
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()
if __name__ == "__main__":
    seed()
