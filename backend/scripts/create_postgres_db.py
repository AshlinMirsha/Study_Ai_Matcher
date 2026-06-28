from pathlib import Path
import sys

env_path = Path(__file__).resolve().parents[1] / '.env'
env = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

DB_NAME = env.get('DB_NAME', 'study_ai_matcher')
DB_USER = env.get('DB_USER', 'postgres')
DB_PASSWORD = env.get('DB_PASSWORD', 'ashlin')
DB_HOST = env.get('DB_HOST', 'localhost')
DB_PORT = env.get('DB_PORT', '5432')

try:
    import psycopg2
except Exception as e:
    print('MISSING_PSYCOG2', e)
    sys.exit(2)

try:
    conn = psycopg2.connect(dbname='postgres', user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM pg_database WHERE datname = %s', (DB_NAME,))
    if cur.fetchone():
        print('DB_EXISTS')
    else:
        cur.execute('CREATE DATABASE "{}"'.format(DB_NAME))
        print('DB_CREATED')
    cur.close()
    conn.close()
except Exception as e:
    print('ERROR', e)
    sys.exit(1)
