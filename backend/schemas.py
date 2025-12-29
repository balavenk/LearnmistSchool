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

class SchoolBase(BaseModel):
    name: str
    address: Optional[str] = None

class SchoolCreate(SchoolBase):
    max_teachers: Optional[int] = 100
    max_students: Optional[int] = 1000
    max_classes: Optional[int] = 50

class School(SchoolBase):
    id: int
    active: bool
    
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
