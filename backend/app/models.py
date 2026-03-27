from pydantic import BaseModel
from sqlalchemy import Column, Index, Integer, String, Boolean, ForeignKey, Enum, DateTime, Text, Table
from sqlalchemy.orm import relationship
from .database import Base
import enum
from datetime import datetime
from sqlalchemy.sql import func
from sqlalchemy import event

grade_subjects = Table(
    "grade_subjects",
    Base.metadata,
    Column("grade_id", Integer, ForeignKey("grades.id"), primary_key=True),
    Column("subject_id", Integer, ForeignKey("subjects.id"), primary_key=True),
)

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    SCHOOL_ADMIN = "SCHOOL_ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"
    INDIVIDUAL = "INDIVIDUAL"

class AssignmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
# ... (keeping existing lines to match context if needed, but replace_file_content works on target content)


class SubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    GRADED = "GRADED"

class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)

    curriculums = relationship("Curriculum", back_populates="country")
    school_types = relationship("SchoolType", back_populates="country")
    schools = relationship("School", back_populates="country")

class Curriculum(Base):
    __tablename__ = "curriculums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    country_id = Column(Integer, ForeignKey("countries.id"))

    country = relationship("Country", back_populates="curriculums")
    schools = relationship("School", back_populates="curriculum")

class SchoolType(Base):
    __tablename__ = "school_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    country_id = Column(Integer, ForeignKey("countries.id"))

    country = relationship("Country", back_populates="school_types")
    schools = relationship("School", back_populates="school_type")

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    address = Column(String(255), nullable=True)
    active = Column(Boolean, default=True)
    max_teachers = Column(Integer, default=100)
    max_students = Column(Integer, default=1000)
    max_classes = Column(Integer, default=50)

    # New FKs
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=True)
    curriculum_id = Column(Integer, ForeignKey("curriculums.id"), nullable=True)
    school_type_id = Column(Integer, ForeignKey("school_types.id"), nullable=True)

    country = relationship("Country", back_populates="schools")
    curriculum = relationship("Curriculum", back_populates="schools")
    school_type = relationship("SchoolType", back_populates="schools")

    users = relationship("User", back_populates="school")
    subjects = relationship("Subject", back_populates="school")
    grades = relationship("Grade", back_populates="school")
    classes = relationship("Class", back_populates="school")
    students = relationship("Student", back_populates="school")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), index=True)
    full_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT)
    active = Column(Boolean, default=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    last_login = Column(DateTime, nullable=True)

    school = relationship("School", back_populates="users")
    teacher_assignments = relationship("TeacherAssignment", back_populates="teacher")
    created_assignments = relationship("Assignment", back_populates="teacher") # Assignments created by this teacher
     # Case-insensitive unique indexes
    __table_args__ = (
        Index('ix_users_username_lower', func.lower(username), unique=True),
        Index('ix_users_email_lower', func.lower(email), unique=True),
    )

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    code = Column(String(20), nullable=True) # Added code column
    school_id = Column(Integer, ForeignKey("schools.id"))

    school = relationship("School", back_populates="subjects")
    assignments = relationship("TeacherAssignment", back_populates="subject")
    grades = relationship("Grade", secondary=grade_subjects, back_populates="subjects")
    active = Column(Boolean, nullable=False, default=True)

class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    school_id = Column(Integer, ForeignKey("schools.id"))

    school = relationship("School", back_populates="grades")
    classes = relationship("Class", back_populates="grade")
    students = relationship("Student", back_populates="grade")
    assignments = relationship("TeacherAssignment", back_populates="grade")
    subjects = relationship("Subject", secondary=grade_subjects, back_populates="grades")

    @property
    def student_count(self):
        return getattr(self, "_student_count", 0)

    @student_count.setter
    def student_count(self, value):
        self._student_count = value

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50)) # e.g., "10-A"
    section = Column(String(10)) # e.g., "A"
    grade_id = Column(Integer, ForeignKey("grades.id"))
    school_id = Column(Integer, ForeignKey("schools.id"))
    
    # Optional: Assign a class teacher
    class_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    grade = relationship("Grade", back_populates="classes")
    school = relationship("School", back_populates="classes")
    students = relationship("Student", back_populates="class_")
    class_teacher = relationship("User", foreign_keys=[class_teacher_id])
    
    # Assignments assigned specifically to this class
    assignments = relationship("Assignment", back_populates="assigned_class")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(255), nullable=True)  # Optional email field
    active = Column(Boolean, default=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True) # Nullable for Individual
    grade_id = Column(Integer, ForeignKey("grades.id"), nullable=True)   # Nullable for Individual
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True) # Link to specific class/section
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Link to login user

    user = relationship("User", foreign_keys=[user_id])

    school = relationship("School", back_populates="students")
    grade = relationship("Grade", back_populates="students")
    class_ = relationship("Class", back_populates="students")
    submissions = relationship("Submission", back_populates="student")

    @property
    def username(self):
        return self.user.username if self.user else None

    @property
    def last_login(self):
        return self.user.last_login if self.user else None

class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    grade_id = Column(Integer, ForeignKey("grades.id"))
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True) # Can assign to specific class

    teacher = relationship("User", back_populates="teacher_assignments")
    subject = relationship("Subject", back_populates="assignments")
    grade = relationship("Grade", back_populates="assignments")
    class_ = relationship("Class")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.DRAFT)
    
    teacher_id = Column(Integer, ForeignKey("users.id"))
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True) # Null means assigned to who? Maybe all classes of teacher? Let's say specific class for now.
    grade_id = Column(Integer, ForeignKey("grades.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True) # Optional link to subject

    # New Fields for Individual/Quiz Generation
    exam_type = Column(String(50), nullable=True)
    question_count = Column(Integer, nullable=True)
    difficulty_level = Column(String(20), nullable=True)
    question_type = Column(String(50), nullable=True)
    generation_type = Column(String(50), default="Manual")

    teacher = relationship("User", back_populates="created_assignments")
    grade = relationship("Grade")
    assigned_class = relationship("Class", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")
    submissions = relationship("Submission", back_populates="assignment")
    subject = relationship("Subject")
    questions = relationship("Question", back_populates="assignment", cascade="all, delete-orphan")



class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    grade = Column(String(10), nullable=True)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")
    answers = relationship("StudentAnswer", back_populates="submission", cascade="all, delete-orphan")

class FileArtifact(Base):
    __tablename__ = "file_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    
    # File Details
    original_filename = Column(String(255))
    stored_filename = Column(String(255))
    relative_path = Column(String(500))  # storage/school_id/grade_id/subject_id/filename
    mime_type = Column(String(100))
    file_extension = Column(String(20))
    file_size = Column(Integer, nullable=True)
    file_status = Column(String(50), default="Uploaded")
    description = Column(String(500), nullable=True)
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Metadata / Context
    tags = Column(Text, nullable=True)
    file_metadata = Column(Text, nullable=True) # JSON Stored as Text

    # Foreign Keys
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    school_id = Column(Integer, ForeignKey("schools.id"))
    grade_id = Column(Integer, ForeignKey("grades.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    
    # Optional Context (Legacy/Future)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)

    # Relationships
    uploaded_by = relationship("User")
    school = relationship("School")
    grade = relationship("Grade")
    subject = relationship("Subject")

class ExamType(Base):
    __tablename__ = "exam_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    school = relationship("School")

class PaperTemplate(Base):
    """A reusable paper structure (blueprint). Contains no actual questions."""
    __tablename__ = "paper_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)               # e.g. "CBSE Standard 80 Marks"
    description = Column(String(500), nullable=True)
    total_marks = Column(Integer, nullable=True)             # e.g. 80
    duration = Column(String(50), nullable=True)             # e.g. "3 Hours"
    visibility = Column(String(20), nullable=False, default="private")  # 'system' | 'shared' | 'private'
    sections_config = Column(Text, nullable=True)            # JSON list: [{name, target_questions, marks_per_question}]
    general_instructions = Column(Text, nullable=True)       # JSON list of instruction strings

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_role = Column(String(50), nullable=True)      # 'admin' | 'teacher'
    cloned_from_id = Column(Integer, ForeignKey("paper_templates.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = relationship("User", foreign_keys=[created_by_id])
    cloned_from = relationship("PaperTemplate", remote_side="PaperTemplate.id", foreign_keys=[cloned_from_id])
    papers = relationship("QuestionPaper", back_populates="template")


class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    board = Column(String(100), nullable=True)
    grade = Column(String(100), nullable=True)
    subject = Column(String(100), nullable=True)
    exam_type = Column(String(100), nullable=True)
    academic_year = Column(String(50), nullable=True)
    total_marks = Column(Integer, nullable=True)
    duration = Column(String(50), nullable=True)
    set_number = Column(String(50), nullable=True)
    
    sections_config = Column(Text, nullable=True) # JSON stored as string
    general_instructions = Column(Text, nullable=True) # JSON stored as string
    
    template_id = Column(Integer, ForeignKey("paper_templates.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by_role = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), nullable=True, default='draft')  # 'draft' | 'complete'

    template = relationship("PaperTemplate", back_populates="papers")
    created_by = relationship("User")
    mappings = relationship("PaperQuestionMapping", back_populates="paper", cascade="all, delete-orphan")

class PaperQuestionMapping(Base):
    __tablename__ = "paper_question_mappings"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("question_papers.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    section_name = Column(String(100), nullable=False)
    order_in_section = Column(Integer, default=0)

    paper = relationship("QuestionPaper", back_populates="mappings")
    question = relationship("Question")

class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"
    SHORT_ANSWER = "SHORT_ANSWER"
    LONG_ANSWER = "LONG_ANSWER"
    CASE_BASED = "CASE_BASED"
    ESSAY = "ESSAY"

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    points = Column(Integer, default=1)
    question_type = Column(Enum(QuestionType), default=QuestionType.MULTIPLE_CHOICE)
    difficulty_level = Column(String(50), nullable=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True) # Make nullable for freestanding questions
    parent_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    year = Column(Integer, nullable=True)
    
    # Paper Builder specific fields
    source_year = Column(String(20), nullable=True)
    source_type = Column(String(50), nullable=True)
    bloom_level = Column(String(50), nullable=True)
    chapter_name = Column(String(255), nullable=True)
    passage = Column(Text, nullable=True)
    sub_questions = Column(Text, nullable=True) # Stored as JSON string
    answer_key = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=True)

    # Optional media attachment
    media_url = Column(String(500), nullable=True)   # local static path or S3 URL later
    media_type = Column(String(20), nullable=True)   # "image" or "video"

    
    # Context columns
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True) # Making nullable for easier migration, but logic will populate
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)

    assignment = relationship("Assignment", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    
    school = relationship("School")
    subject = relationship("Subject")
    class_ = relationship("Class")

class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(500))
    is_correct = Column(Boolean, default=False)
    question_id = Column(Integer, ForeignKey("questions.id"))

    question = relationship("Question", back_populates="options")

# Update Assignment to include questions relationship
# Assignment.questions = relationship("Question", back_populates="assignment", cascade="all, delete-orphan")

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_option_id = Column(Integer, ForeignKey("question_options.id"), nullable=True) # For MCQ
    text_answer = Column(Text, nullable=True) # For Short Answer / Text
    is_correct = Column(Boolean, default=False)
    points_awarded = Column(Integer, default=0)

    submission = relationship("Submission", back_populates="answers")
    question = relationship("Question")
    selected_option = relationship("QuestionOption")

# Update Submission relationship
Submission.answers = relationship("StudentAnswer", back_populates="submission", cascade="all, delete-orphan")
