from database import engine, Base
from models import grade_subjects

# Create the specific table
print("Creating grade_subjects table...")
grade_subjects.create(engine, checkfirst=True)
print("Done!")
