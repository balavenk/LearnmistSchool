from sqlalchemy.orm import Session
from database import SessionLocal, engine
from app import models
from datetime import datetime

db: Session = SessionLocal()

def seed_grading_data():
    print("Seeding Grading Data...")
    
    # 1. Teacher and Student
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Error: teacher1 not found.")
        return

    student = db.query(models.Student).filter(models.Student.name == "Alice Johnson").first()
    if not student:
        print("Error: Student 'Alice Johnson' not found. Run seed_students.py first.")
        return

    # 2. Add a new Quiz Assignment for Grading
    print("Creating grading quiz assignment...")
    quiz = models.Assignment(
        title="History Quiz: World War II",
        description="A quiz about key events in WWII.",
        status=models.AssignmentStatus.PUBLISHED,
        teacher_id=teacher.id,
        subject_id=None, # General
        class_id=student.class_id,
        due_date=datetime.now()
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # 3. Add Questions
    q1 = models.Question(
        text="When did WWII start?",
        points=10,
        question_type=models.QuestionType.MULTIPLE_CHOICE,
        assignment_id=quiz.id
    )
    db.add(q1)
    db.commit()
    
    opt1_a = models.QuestionOption(text="1939", is_correct=True, question_id=q1.id)
    opt1_b = models.QuestionOption(text="1941", is_correct=False, question_id=q1.id)
    db.add_all([opt1_a, opt1_b])
    
    q2 = models.Question(
        text="Describe the importance of D-Day.",
        points=20,
        question_type=models.QuestionType.SHORT_ANSWER,
        assignment_id=quiz.id
    )
    db.add(q2)
    db.commit()

    # 4. Create Submission for Student
    print("Creating submission...")
    sub = models.Submission(
        assignment_id=quiz.id,
        student_id=student.id,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now()
    )
    
    db.add(sub)
    db.commit()
    db.refresh(sub)

    # 5. Create Student Answers
    print("Creating student answers...")
    # Correct Answer for Q1
    ans1 = models.StudentAnswer(
        submission_id=sub.id,
        question_id=q1.id,
        selected_option_id=opt1_a.id,
        is_correct=True,
        points_awarded=10
    )
    db.add(ans1)

    # Text Answer for Q2
    ans2 = models.StudentAnswer(
        submission_id=sub.id,
        question_id=q2.id,
        text_answer="It was the turning point of the war in Europe, allowing the Allies to regain a foothold in France.",
        is_correct=False, # Teacher needs to grade
        points_awarded=0
    )
    db.add(ans2)
    
    db.commit()
    print("Grading Data Seeded Successfully!")

if __name__ == "__main__":
    seed_grading_data()
