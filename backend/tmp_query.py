from app.database import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    rs = conn.execute(text("SELECT username, role FROM users WHERE role LIKE '%ADMIN%' OR username='superadmin';"))
    for row in rs:
        print(dict(row._mapping))
