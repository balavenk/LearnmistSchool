import psycopg2
from psycopg2 import sql
import os

# Possible configurations to try
configs = [
    {"user": "postgres", "password": "password", "host": "127.0.0.1", "port": "5432"},
    {"user": "postgres", "password": "password", "host": "127.0.0.1", "port": "5435"},
    {"user": "user", "password": "password", "host": "127.0.0.1", "port": "5435"}, 
    {"user": "postgres", "password": "jalin2404", "host": "127.0.0.1", "port": "5432"}, # New correct config
]

def try_connect_and_create():
    for config in configs:
        print(f"Trying to connect to {config['host']}:{config['port']} as {config['user']}...")
        try:
            # Connect to 'postgres' default db to create new db
            conn = psycopg2.connect(
                dbname="postgres",
                user=config["user"],
                password=config["password"],
                host=config["host"],
                port=config["port"]
            )
            conn.autocommit = True
            cur = conn.cursor()
            
            # Check if db exists
            cur.execute("SELECT 1 FROM pg_database WHERE datname='learnmistschool'")
            exists = cur.fetchone()
            
            if not exists:
                print("Creating database 'learnmistschool'...")
                cur.execute(sql.SQL("CREATE DATABASE learnmistschool"))
            else:
                print("Database 'learnmistschool' already exists.")
                
            cur.close()
            conn.close()
            
            # Return the working config so we can update .env
            print(f"✅ Success with config: {config}")
            return config
            
        except Exception as e:
            print(f"❌ Failed: {e}")
            
    return None

if __name__ == "__main__":
    success_config = try_connect_and_create()
    if success_config:
        print("\n___FOUND_CONFIG___")
        print(success_config)
    else:
        print("\n___NO_CONNECTION___")
