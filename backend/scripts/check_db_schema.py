from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('schools')]
print("Columns in 'schools' table:", columns)

missing = []
for col in ['country_id', 'curriculum_id', 'school_type_id']:
    if col not in columns:
        missing.append(col)

if missing:
    print(f"MISSING COLUMNS: {missing}")
else:
    print("All columns present.")
