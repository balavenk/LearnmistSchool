# Database Migration to PostgreSQL

We have successfully migrated the backend database from SQLite to a Dockerized PostgreSQL instance for production-readiness.

This document outlines what changed and provides step-by-step instructions for team members to update their local environments.

## What Changed to Make the Migration Work

1. **Dockerized PostgreSQL Initialization**
   * Configured a `docker-compose.yml` service specifically for PostgreSQL on port `5440` to ensure a consistent, persistent environment separate from the filesystem database.
2. **Alembic Schema Synchronization**
   * **The Problem:** The old Alembic migration histories were out of sync with current `models.py` definitions.
   * **The Solution:** We generated a brand new `--autogenerate` Alembic revision to exactly map the Postgres backend to the Python schemas natively.
3. **Explicit Type Casting Strategy**
   * SQLite represents Booleans as `0` or `1`, and JSON as generic strings/dicts. PostgreSQL enforces strict data types.
   * Custom logic was added in the migration script to auto-detect column types via SQLAlchemy metadata, dynamically converting SQLite's integer representation to Postgres's `True`/`False`, and safely serializing dictionaries using `json.dumps()`.
4. **Foreign Key Integrity Sequencing**
   * Instead of bulk migrating dynamically, we explicitly hard-coded the sequence (e.g., `countries` -> `schools` -> `users` -> `students`). This ensures that PostgreSQL never rejects a `user` insert due to its parent `school` failing to exist yet.
5. **Data Cleansing & Strict Enums**
   * Postgres enforces strict `ENUM` definitions. The script patched outdated records (like 3 legacy users with the `"INDIVIDUAL"` role) by actively mapping them to `"STUDENT"` so 100% of data remained intact under PostgreSQL's tighter relational checks.

---

## Instructions for Team Members

Please follow these steps to update your local environment and switch exactly to the new infrastructure without breaking your app or losing your historic data:

1. **Pull the branch** (or the main branch once merged):
   ```bash
   git pull origin feature/jalin-postgresql-prod
   ```

2. **Spin up the new database container:**
   Make sure Docker Desktop is running, then execute from the root directory:
   ```bash
   docker-compose up -d db
   ```

3. **Update your Environment Variables:**
   Go into your `backend/.env` file and **replace** your `DATABASE_URL` with:
   ```
   DATABASE_URL=postgresql+psycopg2://mist_user:mist_pass@localhost:5440/learnmistschool
   ```

4. **Generate the Postgres Tables:**
   Navigate to the `backend/` directory in your terminal and execute:
   ```bash
   venv\Scripts\alembic upgrade head
   ```

5. **(Optional) Migrate your local SQLite Data:**
   If you have existing local data in your `learnmistschool.db` SQLite file that you want to transfer into the new PostgreSQL database, run the fully automated migration script from the `backend/` directory:
   ```bash
   venv\Scripts\python scripts\migrate_sqlite_to_postgres.py
   ```

Once done, run your backend server (`uvicorn app.main:app --reload`) and frontend as usual!
