from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime, timedelta

db: Session = SessionLocal()

def seed_alice():
    print("Seeding Alice Johnson and Assignments...")

    # 0. Cleanup Old Data for Alice
    existing_alice = db.query(models.Student).filter(models.Student.name == "Alice Johnson").first()
    if existing_alice:
        print("Cleaning up old Alice data...")
        # Delete submissions
        db.query(models.Submission).filter(models.Submission.student_id == existing_alice.id).delete()
        # Delete assignments created for her (identifying by title for simplicity or just delete all her submissions links)
        # Actually we want to delete the assignments created by previous runs of this script
        db.query(models.Assignment).filter(models.Assignment.title.in_(["Alice's Math Quiz", "Alice's Science Project"])).delete(synchronize_session=False)
        db.commit()
    
    # 1. Find Teacher 1
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Teacher1 not found!")
        return

    # 2. Find a Class for Teacher 1 (e.g. 10 A)
    # We need a class that is visible to Teacher 1
    # Check existing class
    class_obj = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == teacher.id
    ).first()

    if not class_obj:
        print("No visible class found for teacher1. Please run seed_grading_data.py first or ensure classes exist.")
        return
    
    print(f"Assigning Alice to Class: {class_obj.name}")

    # 3. Create/Get Alice
    alice = db.query(models.Student).filter(models.Student.name == "Alice Johnson").first()
    if not alice:
        alice = models.Student(
            name="Alice Johnson",
            school_id=teacher.school_id,
            grade_id=class_obj.grade_id,
            class_id=class_obj.id,
            active=True
        )
        db.add(alice)
        db.commit()
        db.refresh(alice)
        print("Created Alice Johnson.")
    else:
        # Ensure she is in the right class
        alice.class_id = class_obj.id
        db.commit()
        print("Updated Alice Johnson's class.")

    # 4. Create Quiz Assignment (Has Questions)
    quiz = models.Assignment(
        title="Alice's Math Quiz",
        description="Solve the equations.",
        due_date=datetime.now() + timedelta(days=7),
        status=models.AssignmentStatus.PUBLISHED,
        teacher_id=teacher.id,
        class_id=class_obj.id,
        subject_id=None # Can be null or fetch a subject if needed
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # Add Questions to make it a Quiz
    q1 = models.Question(text="2 + 2 = ?", points=5, question_type=models.QuestionType.SHORT_ANSWER, assignment_id=quiz.id)
    db.add(q1)
    db.commit()

    # Submission for Quiz
    sub_quiz = models.Submission(
        assignment_id=quiz.id,
        student_id=alice.id,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now()
    )
    db.add(sub_quiz)
    db.commit()
    
    # Add Answer
    db.add(models.StudentAnswer(submission_id=sub_quiz.id, question_id=q1.id, text_answer="4", is_correct=True, points_awarded=5))
    db.commit()
    print("Created Quiz Assignment + Submission.")

    # 5. Create Project Assignment (No Questions)
    project = models.Assignment(
        title="Alice's Science Project",
        description="Build a volcano model.",
        due_date=datetime.now() + timedelta(days=14),
        status=models.AssignmentStatus.PUBLISHED,
        teacher_id=teacher.id,
        class_id=class_obj.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Submission for Project
    sub_project = models.Submission(
        assignment_id=project.id,
        student_id=alice.id,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now()
    )
    db.add(sub_project)
    db.commit()
    print("Created Project Assignment + Submission.")

    print("Seeding Complete.")

if __name__ == "__main__":
    seed_alice()
