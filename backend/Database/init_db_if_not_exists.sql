-- ====================================================================
-- Auto-generated PostgreSQL schema setup with IF NOT EXISTS
-- ====================================================================

DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'INDIVIDUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assignmentstatus AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submissionstatus AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE questiontype AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS countries (
	id SERIAL NOT NULL, 
	name VARCHAR(100), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS ix_countries_id ON countries (id);

CREATE TABLE IF NOT EXISTS curriculums (
	id SERIAL NOT NULL, 
	name VARCHAR(100), 
	country_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(country_id) REFERENCES countries (id)
);

CREATE INDEX IF NOT EXISTS ix_curriculums_id ON curriculums (id);

CREATE TABLE IF NOT EXISTS school_types (
	id SERIAL NOT NULL, 
	name VARCHAR(100), 
	country_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(country_id) REFERENCES countries (id)
);

CREATE INDEX IF NOT EXISTS ix_school_types_id ON school_types (id);

CREATE TABLE IF NOT EXISTS schools (
	id SERIAL NOT NULL, 
	name VARCHAR(100), 
	address VARCHAR(255), 
	active BOOLEAN, 
	max_teachers INTEGER, 
	max_students INTEGER, 
	max_classes INTEGER, 
	country_id INTEGER, 
	curriculum_id INTEGER, 
	school_type_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(country_id) REFERENCES countries (id), 
	FOREIGN KEY(curriculum_id) REFERENCES curriculums (id), 
	FOREIGN KEY(school_type_id) REFERENCES school_types (id)
);

CREATE INDEX IF NOT EXISTS ix_schools_id ON schools (id);

CREATE UNIQUE INDEX ix_schools_name ON schools (name);

CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	username VARCHAR(50), 
	email VARCHAR(100), 
	hashed_password VARCHAR(255) NOT NULL, 
	role userrole, 
	active BOOLEAN, 
	school_id INTEGER, 
	last_login TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id)
);

CREATE UNIQUE INDEX ix_users_username_lower ON users (lower(username));

CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);

CREATE UNIQUE INDEX ix_users_email_lower ON users (lower(email));

CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);

CREATE TABLE IF NOT EXISTS subjects (
	id SERIAL NOT NULL, 
	name VARCHAR(50), 
	code VARCHAR(20), 
	school_id INTEGER, 
	active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id)
);

CREATE INDEX IF NOT EXISTS ix_subjects_id ON subjects (id);

CREATE TABLE IF NOT EXISTS grades (
	id SERIAL NOT NULL, 
	name VARCHAR(50), 
	school_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id)
);

CREATE INDEX IF NOT EXISTS ix_grades_id ON grades (id);

CREATE TABLE IF NOT EXISTS grade_subjects (
	grade_id INTEGER NOT NULL, 
	subject_id INTEGER NOT NULL, 
	PRIMARY KEY (grade_id, subject_id), 
	FOREIGN KEY(grade_id) REFERENCES grades (id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id)
);

CREATE TABLE IF NOT EXISTS classes (
	id SERIAL NOT NULL, 
	name VARCHAR(50), 
	section VARCHAR(10), 
	grade_id INTEGER, 
	school_id INTEGER, 
	class_teacher_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(grade_id) REFERENCES grades (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id), 
	FOREIGN KEY(class_teacher_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_classes_id ON classes (id);

CREATE TABLE IF NOT EXISTS students (
	id SERIAL NOT NULL, 
	name VARCHAR(100), 
	email VARCHAR(255), 
	active BOOLEAN, 
	school_id INTEGER, 
	grade_id INTEGER, 
	class_id INTEGER, 
	user_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id), 
	FOREIGN KEY(grade_id) REFERENCES grades (id), 
	FOREIGN KEY(class_id) REFERENCES classes (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_students_id ON students (id);

CREATE TABLE IF NOT EXISTS teacher_assignments (
	id SERIAL NOT NULL, 
	teacher_id INTEGER, 
	subject_id INTEGER, 
	grade_id INTEGER, 
	class_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(teacher_id) REFERENCES users (id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id), 
	FOREIGN KEY(grade_id) REFERENCES grades (id), 
	FOREIGN KEY(class_id) REFERENCES classes (id)
);

CREATE INDEX IF NOT EXISTS ix_teacher_assignments_id ON teacher_assignments (id);

CREATE TABLE IF NOT EXISTS assignments (
	id SERIAL NOT NULL, 
	title TEXT NOT NULL, 
	description TEXT, 
	due_date TIMESTAMP WITHOUT TIME ZONE, 
	status assignmentstatus, 
	teacher_id INTEGER, 
	class_id INTEGER, 
	grade_id INTEGER, 
	subject_id INTEGER, 
	exam_type VARCHAR(50), 
	question_count INTEGER, 
	difficulty_level VARCHAR(20), 
	question_type VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(teacher_id) REFERENCES users (id), 
	FOREIGN KEY(class_id) REFERENCES classes (id), 
	FOREIGN KEY(grade_id) REFERENCES grades (id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id)
);

CREATE INDEX IF NOT EXISTS ix_assignments_id ON assignments (id);

CREATE TABLE IF NOT EXISTS submissions (
	id SERIAL NOT NULL, 
	assignment_id INTEGER, 
	student_id INTEGER, 
	status submissionstatus, 
	grade VARCHAR(10), 
	feedback TEXT, 
	submitted_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(assignment_id) REFERENCES assignments (id), 
	FOREIGN KEY(student_id) REFERENCES students (id)
);

CREATE INDEX IF NOT EXISTS ix_submissions_id ON submissions (id);

CREATE TABLE IF NOT EXISTS questions (
	id SERIAL NOT NULL, 
	text TEXT, 
	points INTEGER, 
	question_type questiontype, 
	difficulty_level VARCHAR(50), 
	assignment_id INTEGER, 
	parent_question_id INTEGER, 
	year INTEGER, 
	media_url VARCHAR(500), 
	media_type VARCHAR(20), 
	school_id INTEGER, 
	subject_id INTEGER, 
	class_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(assignment_id) REFERENCES assignments (id), 
	FOREIGN KEY(parent_question_id) REFERENCES questions (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id), 
	FOREIGN KEY(class_id) REFERENCES classes (id)
);

CREATE INDEX IF NOT EXISTS ix_questions_id ON questions (id);

CREATE TABLE IF NOT EXISTS file_artifacts (
	id SERIAL NOT NULL, 
	original_filename VARCHAR(255), 
	stored_filename VARCHAR(255), 
	relative_path VARCHAR(500), 
	mime_type VARCHAR(100), 
	file_extension VARCHAR(20), 
	file_size INTEGER, 
	file_status VARCHAR(50), 
	description VARCHAR(500), 
	uploaded_at TIMESTAMP WITHOUT TIME ZONE, 
	tags TEXT, 
	file_metadata TEXT, 
	uploaded_by_id INTEGER, 
	school_id INTEGER, 
	grade_id INTEGER, 
	subject_id INTEGER, 
	assignment_id INTEGER, 
	submission_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(uploaded_by_id) REFERENCES users (id), 
	FOREIGN KEY(school_id) REFERENCES schools (id), 
	FOREIGN KEY(grade_id) REFERENCES grades (id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id), 
	FOREIGN KEY(assignment_id) REFERENCES assignments (id), 
	FOREIGN KEY(submission_id) REFERENCES submissions (id)
);

CREATE INDEX IF NOT EXISTS ix_file_artifacts_id ON file_artifacts (id);

CREATE TABLE IF NOT EXISTS question_options (
	id SERIAL NOT NULL, 
	text VARCHAR(500), 
	is_correct BOOLEAN, 
	question_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(question_id) REFERENCES questions (id)
);

CREATE INDEX IF NOT EXISTS ix_question_options_id ON question_options (id);

CREATE TABLE IF NOT EXISTS student_answers (
	id SERIAL NOT NULL, 
	submission_id INTEGER, 
	question_id INTEGER, 
	selected_option_id INTEGER, 
	text_answer TEXT, 
	is_correct BOOLEAN, 
	points_awarded INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(submission_id) REFERENCES submissions (id), 
	FOREIGN KEY(question_id) REFERENCES questions (id), 
	FOREIGN KEY(selected_option_id) REFERENCES question_options (id)
);

CREATE INDEX IF NOT EXISTS ix_student_answers_id ON student_answers (id);

