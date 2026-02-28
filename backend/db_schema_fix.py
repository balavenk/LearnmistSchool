import sqlite3

def add_column_if_not_exists(cursor, table, column_name, column_type):
    # Get current columns
    cursor.execute(f"PRAGMA table_info({table});")
    columns = [row[1] for row in cursor.fetchall()]
    if column_name not in columns:
        print(f"Adding column {column_name} to {table}...")
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_name} {column_type};")
        except sqlite3.OperationalError as e:
            print(f"Error adding {column_name}: {e}")
    else:
        print(f"Column {column_name} already exists in {table}.")

if __name__ == "__main__":
    db_path = '/home/balav/app/backend/learnmistschool.db'
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Check assignments table
    print("Checking assignments table schema...")
    add_column_if_not_exists(c, 'assignments', 'grade_id', 'INTEGER')
    add_column_if_not_exists(c, 'assignments', 'subject_id', 'INTEGER')
    add_column_if_not_exists(c, 'assignments', 'exam_type', 'VARCHAR(50)')
    add_column_if_not_exists(c, 'assignments', 'question_count', 'INTEGER')
    add_column_if_not_exists(c, 'assignments', 'difficulty_level', 'VARCHAR(20)')
    add_column_if_not_exists(c, 'assignments', 'question_type', 'VARCHAR(50)')
    
    conn.commit()
    conn.close()
    print("Schema update complete.")
