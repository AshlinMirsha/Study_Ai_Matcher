import psycopg
from psycopg import errors

try:
    with psycopg.connect("dbname=postgres user=postgres password=ashlin  host=localhost port=5432", autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute("CREATE DATABASE study_ai_matcher")
            print("Database 'study_ai_matcher' created successfully.")
except errors.DuplicateDatabase:
    print("Database 'study_ai_matcher' already exists.")
except Exception as e:
    print(f"Error creating database: {e}")
