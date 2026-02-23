from pydantic import BaseModel, Field
from typing import Optional, List, Generic, TypeVar
from datetime import datetime
from .models import UserRole, AssignmentStatus, SubmissionStatus

class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = None
    username: Optional[str] = None
    id: Optional[int] = None
    school_name: Optional[str] = None

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

class StudentSubjectStats(BaseModel):
    subject_id: int
    subject_name: str
    total_assignments: int
    completed_assignments: int
    pending_assignments: int

class FileArtifactBase(BaseModel):
    id: int
    original_filename: str
    uploaded_at: datetime
    file_size: Optional[int] = None
    file_extension: Optional[str] = None
    mime_type: Optional[str] = None
    file_status: Optional[str] = "Uploaded"
    subject_id: int
    subject_name: Optional[str] = None
    school_name: Optional[str] = None
    grade_name: Optional[str] = None
    description: Optional[str] = None

class FileArtifactUpdate(BaseModel):
    file_status: str
    file_metadata: Optional[str] = None # JSON string

class FileArtifactOut(FileArtifactBase):
    file_metadata: Optional[str] = None
    class Config:
        from_attributes = True

# Generic pagination response
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

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
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserStatusUpdate(BaseModel):
    active: bool

class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None

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
    subjects: List['Subject'] = []
    
    class Config:
        from_attributes = True

class GradeSubjectUpdate(BaseModel):
    subject_ids: List[int]


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
    grade_id: Optional[int] = None
    class_id: Optional[int] = None
    email: Optional[str] = None
    school_id: Optional[int] = None # For manual creation if needed

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    grade_id: Optional[int] = None
    class_id: Optional[int] = None
    active: Optional[bool] = None
    email: Optional[str] = None
    school_id: Optional[int] = None

class Student(StudentBase):
    id: int
    active: bool
    school_id: Optional[int] = None
    grade_id: Optional[int] = None
    class_id: Optional[int] = None
    username: Optional[str] = None
    user_id: Optional[int] = None
    last_login: Optional[datetime] = None
    email: Optional[str] = None
    
    class Config:
        from_attributes = True

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[AssignmentStatus] = AssignmentStatus.DRAFT
    
    # New Fields
    exam_type: Optional[str] = None
    question_count: Optional[int] = None
    difficulty_level: Optional[str] = None
    question_type: Optional[str] = None

class AssignmentCreate(AssignmentBase):
    grade_id: Optional[int] = None  # Assign to a grade (frontend sends this)
    assigned_to_class_id: Optional[int] = None  # Legacy support, maps to class_id
    subject_id: Optional[int] = None

class AssignmentAICreate(BaseModel):
    topic: str
    grade_level: str
    difficulty: str
    question_count: int
    subject_id: int
    grade_id: int
    due_date: Optional[datetime] = None
    use_pdf_context: Optional[bool] = False

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
    submission_id: Optional[int] = None

class QuestionOptionBase(BaseModel):
    text: str
    is_correct: bool

class QuestionOptionCreate(QuestionOptionBase):
    pass

class QuestionOptionOut(BaseModel):
    id: int
    text: str
    question_id: int
    # No is_correct here
    class Config:
        from_attributes = True

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

class QuestionOut(QuestionBase):
    id: int
    assignment_id: int
    difficulty_level: Optional[str] = None
    options: List[QuestionOptionOut] = []
    
    class Config:
        from_attributes = True

class Question(QuestionBase):
    id: int
    assignment_id: int
    options: List[QuestionOption] = []
    
    difficulty_level: Optional[str] = None
    school_id: Optional[int] = None
    subject_id: Optional[int] = None
    class_id: Optional[int] = None
    parent_question_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class AssignmentFromBankCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    grade_id: Optional[int] = None  # Frontend sends grade_id
    class_id: Optional[int] = None  # Legacy support
    subject_id: int
    question_ids: List[int]



class SubmissionBase(BaseModel):
    pass

class StudentAnswerBase(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    text_answer: Optional[str] = None

class StudentAnswerCreate(StudentAnswerBase):
    pass

class SubmissionCreate(SubmissionBase):
    assignment_id: int
    answers: List[StudentAnswerCreate] = []

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

# --- Grading Schemas ---

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
    total_quizzes: int = 0
    total_projects: int = 0
    recent_schools: List[School] = [] # Re-using School schema

class PasswordResetRequest(BaseModel):
    password: str

# --- Teacher Assignment Schemas ---

class TeacherAssignmentBase(BaseModel):
    subject_id: int
    grade_id: int
    class_id: Optional[int] = None

class TeacherAssignmentCreate(TeacherAssignmentBase):
    pass

class TeacherAssignment(TeacherAssignmentBase):
    id: int
    teacher_id: int
    subject: Optional[Subject] = None
    grade: Optional[Grade] = None
    class_: Optional[Class] = None # Maps to property in model

    class Config:
        from_attributes = True

