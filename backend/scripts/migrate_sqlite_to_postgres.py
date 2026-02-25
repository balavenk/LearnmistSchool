import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import models

# PostgreSQL Engine (Target)
PG_URL = "postgresql+psycopg2://mist_user:mist_pass@localhost:5440/learnmistschool"
pg_engine = create_engine(PG_URL)
PgSession = sessionmaker(bind=pg_engine)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_PATH = os.path.join(BASE_DIR, "learnmistschool.db")

# SQLite Engine (Source)
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"
sqlite_engine = create_engine(SQLITE_URL)
SqliteSession = sessionmaker(bind=sqlite_engine)

def migrate_data():
    print("Starting ORM-based migration from SQLite to PostgreSQL...")
    
    # We query from SQLite using Session, which builds queries directly
    # and bypasses full database reflection.
    
    source_session = SqliteSession()
    target_session = PgSession()

    try:
        from sqlalchemy import text
        pg_meta = models.Base.metadata
        
        # Assuming tables already created via manual alembic upgrade head
        print("Schema assumed ready.")

        
        # 2. Migrate Data based on ORM models
        # Map table names back to ORM classes programmatically
        table_to_class = {mapper.class_.__tablename__: mapper.class_ for mapper in models.Base.registry.mappers}

        ordered_table_names = [
            "countries",
            "curriculums",
            "school_types",
            "schools",
            "users",
            "subjects",
            "grades",
            "grade_subjects",
            "classes",
            "students",
            "teacher_assignments",
            "assignments",
            "questions",
            "question_options",
            "submissions",
            "student_answers",
            "file_artifacts"
        ]
        
        ordered_tables = [pg_meta.tables[name] for name in ordered_table_names if name in pg_meta.tables]

        for table in ordered_tables:
            table_name = table.name
            if table_name not in table_to_class:
                print(f"Skipping {table_name} - No mapped ORM class found.")
                continue

            OrmClass = table_to_class[table_name]
            print(f"Migrating {table_name}...")
            
            try:
                # Fetch all rows from SQLite using raw core queries to avoid ORM relationship issues during bulk inserts
                import sqlite3
                conn = sqlite3.connect(SQLITE_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(f"SELECT * FROM {table_name}")
                rows = cursor.fetchall()
                conn.close()
                
                print(f"  Found {len(rows)} rows.")
                if not rows:
                    continue

                # Get target columns
                target_columns = {col.name for col in table.columns}
                
                # Fetch rows
                filtered_rows = [{k: v for k, v in dict(row).items() if k in target_columns} for row in rows]
                
                if not filtered_rows:
                    continue
                    
                import psycopg2
                import json
                with psycopg2.connect("dbname=learnmistschool user=mist_user password=mist_pass host=localhost port=5440") as conn:
                    with conn.cursor() as cur:
                        if table_name == 'users':
                            seen_emails = set()
                            for row_dict in filtered_rows:
                                if row_dict.get('email'):
                                    base_email = row_dict['email'].lower()
                                    email_name, domain = base_email.split('@') if '@' in base_email else (base_email, "unknown.com")
                                    unique_email = base_email
                                    counter = 2
                                    while unique_email in seen_emails:
                                        unique_email = f"{email_name}{counter}@{domain}"
                                        counter += 1
                                    row_dict['email'] = unique_email
                                    seen_emails.add(unique_email)
                                if row_dict.get('username'):
                                    row_dict['username'] = row_dict['username'].lower()
                                if row_dict.get('role') == 'INDIVIDUAL':
                                    row_dict['role'] = 'STUDENT'
                                
                                columns = list(row_dict.keys())
                                values = []
                                for col in columns:
                                    val = row_dict[col]
                                    col_type = str(table.columns[col].type)
                                    if 'BOOLEAN' in col_type.upper():
                                        val = bool(val)
                                    elif 'JSON' in col_type.upper() and isinstance(val, (dict, list)):
                                        val = json.dumps(val)
                                    values.append(val)
                                    
                                insert_query = f"INSERT INTO {table_name} ({','.join(columns)}) VALUES ({','.join(['%s']*len(columns))})"
                                try:
                                    cur.execute(insert_query, tuple(values))
                                    conn.commit()
                                except Exception as e:
                                    conn.rollback()
                                    print(f"    Skipping user ID {row_dict.get('id')} - ERROR: {e}")
                        else:
                            for row_dict in filtered_rows:
                                columns = list(row_dict.keys())
                                values = []
                                for col in columns:
                                    val = row_dict[col]
                                    col_type = str(table.columns[col].type)
                                    if 'BOOLEAN' in col_type.upper():
                                        val = bool(val)
                                    elif 'JSON' in col_type.upper() and isinstance(val, (dict, list)):
                                        val = json.dumps(val)
                                    values.append(val)
                                    
                                insert_query = f"INSERT INTO {table_name} ({','.join(columns)}) VALUES ({','.join(['%s']*len(columns))})"
                                try:
                                    cur.execute(insert_query, tuple(values))
                                    conn.commit()
                                except Exception as e:
                                    conn.rollback()
                                    print(f"    Skipping row in {table_name} - ERROR: {e}")
            except Exception as e:
                print(f"  Error migrating {table.name}: {e}")

                
        # 3. Reset sequences
        print("Resetting sequences in PostgreSQL...")
        for table in pg_meta.sorted_tables:
             try:
                with pg_engine.begin() as pg_conn:
                    pg_conn.execute(text(f"SELECT setval('{table.name}_id_seq', coalesce(max(id)+1, 1), false) FROM {table.name};"))
             except Exception as e:
                 pass
                 
        print("Data Migration Complete!")

    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        source_session.close()
        target_session.close()

if __name__ == "__main__":
    migrate_data()
