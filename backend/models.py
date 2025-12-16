from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .database import Base
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    SCHOOL_ADMIN = "SCHOOL_ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    active = Column(Boolean, default=True)
    max_teachers = Column(Integer, default=100)
    max_students = Column(Integer, default=1000)

    users = relationship("User", back_populates="school")
    subjects = relationship("Subject", back_populates="school")
    grades = relationship("Grade", back_populates="school")
    students = relationship("Student", back_populates="school")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.STUDENT)
    active = Column(Boolean, default=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True) # Null setup for Super Admin

    school = relationship("School", back_populates="users")
    teacher_assignments = relationship("TeacherAssignment", back_populates="teacher")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    school_id = Column(Integer, ForeignKey("schools.id"))

    school = relationship("School", back_populates="subjects")
    assignments = relationship("TeacherAssignment", back_populates="subject")

class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    school_id = Column(Integer, ForeignKey("schools.id"))

    school = relationship("School", back_populates="grades")
    students = relationship("Student", back_populates="grade")
    assignments = relationship("TeacherAssignment", back_populates="grade")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    active = Column(Boolean, default=True)
    school_id = Column(Integer, ForeignKey("schools.id"))
    grade_id = Column(Integer, ForeignKey("grades.id"))

    school = relationship("School", back_populates="students")
    grade = relationship("Grade", back_populates="students")

class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    grade_id = Column(Integer, ForeignKey("grades.id"))

    teacher = relationship("User", back_populates="teacher_assignments")
    subject = relationship("Subject", back_populates="assignments")
    grade = relationship("Grade", back_populates="assignments")
