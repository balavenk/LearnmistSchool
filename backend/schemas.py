from pydantic import BaseModel
from typing import Optional, List
from models import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    school_id: Optional[int] = None

class SchoolBase(BaseModel):
    name: str

class SchoolCreate(SchoolBase):
    max_teachers: Optional[int] = 100
    max_students: Optional[int] = 1000

class School(SchoolBase):
    id: int
    active: bool
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: UserRole
    school_id: Optional[int] = None

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

class StudentBase(BaseModel):
    name: str

class StudentCreate(StudentBase):
    grade_id: int

class Student(StudentBase):
    id: int
    active: bool
    school_id: int
    grade_id: int
    
    class Config:
        from_attributes = True
