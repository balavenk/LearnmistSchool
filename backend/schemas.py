from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models import UserRole, AssignmentStatus, SubmissionStatus

class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = None
    username: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    school_id: Optional[int] = None

class CountryBase(BaseModel):
    name: str

class CountryCreate(CountryBase):
    pass

class Country(CountryBase):
    id: int
    class Config: from_attributes = True

class CurriculumBase(BaseModel):
    name: str
    country_id: int

class CurriculumCreate(CurriculumBase):
    pass

class Curriculum(CurriculumBase):
    id: int
    class Config: from_attributes = True

class SchoolTypeBase(BaseModel):
    name: str
    country_id: int

class SchoolTypeCreate(SchoolTypeBase):
    pass

class SchoolType(SchoolTypeBase):
    id: int
    class Config: from_attributes = True

class SchoolBase(BaseModel):
    name: str
    address: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None
    school_type_id: Optional[int] = None

class SchoolCreate(SchoolBase):
    max_teachers: Optional[int] = 100
    max_students: Optional[int] = 1000
    max_classes: Optional[int] = 50

class School(SchoolBase):
    id: int
    active: bool
    student_count: Optional[int] = 0
    teacher_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: UserRole
    # school_id: Optional[int] = None # Generally inferred from admin or current user

class User(UserBase):
    id: int
    active: bool
    role: UserRole
    school_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class SubjectBase(BaseModel):
    name: str

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    school_id: int
    
    class Config:
        from_attributes = True

class GradeBase(BaseModel):
    name: str
    
class GradeCreate(GradeBase):
    pass

class Grade(GradeBase):
    id: int
    school_id: int
    class Config:
        from_attributes = True

class ClassBase(BaseModel):
    name: str
    section: str

class ClassCreate(ClassBase):
    grade_id: int
    class_teacher_id: Optional[int] = None

class Class(ClassBase):
    id: int
    school_id: int
    grade_id: int
    class_teacher_id: Optional[int] = None
    grade: Optional['Grade'] = None
    
    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    name: str

class StudentCreate(StudentBase):
    grade_id: int
    class_id: Optional[int] = None

class Student(StudentBase):
    id: int
    active: bool
    school_id: int
    grade_id: int
    class_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[AssignmentStatus] = AssignmentStatus.DRAFT

class AssignmentCreate(AssignmentBase):
    assigned_to_class_id: int # Explicitly assign to a class for now
    subject_id: Optional[int] = None

class Assignment(AssignmentBase):
    id: int
    teacher_id: int
    class_id: Optional[int]
    subject_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class AssignmentOut(Assignment):
    subject_name: Optional[str] = "General"
    teacher_name: Optional[str] = "Unknown"
    created_at: Optional[datetime] = None # Assuming we might add this to model or map it

class QuestionOptionBase(BaseModel):
    text: str
    is_correct: bool

class QuestionOptionCreate(QuestionOptionBase):
    pass

class QuestionOption(QuestionOptionBase):
    id: int
    question_id: int
    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    text: str
    points: int
    question_type: str # string representation of Enum

class QuestionCreate(QuestionBase):
    options: List[QuestionOptionCreate] = []

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    points: Optional[int] = None
    question_type: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None

class Question(QuestionBase):
    id: int
    assignment_id: int
    options: List[QuestionOption] = []
    
    class Config:
        from_attributes = True



class SubmissionBase(BaseModel):
    pass

class SubmissionCreate(SubmissionBase):
    assignment_id: int

class SubmissionUpdate(BaseModel):
    status: Optional[SubmissionStatus] = None
    grade: Optional[str] = None
    feedback: Optional[str] = None

class Submission(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    status: SubmissionStatus
    grade: Optional[str] = None
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Grading Schemas ---

class StudentAnswerBase(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    text_answer: Optional[str] = None

class StudentAnswerCreate(StudentAnswerBase):
    pass

class StudentAnswer(StudentAnswerBase):
    id: int
    submission_id: int
    is_correct: bool
    points_awarded: int

    class Config:
        from_attributes = True

class GradingUpdate(BaseModel):
    grade: str # Letter grade or score
    feedback: Optional[str] = None
    answers: List[dict] # List of {question_id: int, points: int, is_correct: bool}

class AssignmentDetail(Assignment):
    questions: List[Question] = []

class SubmissionDetail(Submission):
    answers: List[StudentAnswer] = []
    assignment: AssignmentDetail
    student: Student

class ClassStats(BaseModel):
    id: int
    name: str
    section: str
    student_count: int
    grade_name: str

class DashboardStats(BaseModel):
    total_students: int
    total_classes: int
    classes: List[ClassStats]

class SchoolAdminStats(BaseModel):
    total_students: int
    total_teachers: int
    total_classes: int

class SuperAdminStats(BaseModel):
    total_schools: int
    active_users: int
    recent_schools: List[School] = [] # Re-using School schema

