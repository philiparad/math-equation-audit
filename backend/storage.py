"""SQLite persistence with an audit-oriented, single-user data model."""
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.environ.get('DATA_DIR', str(ROOT / 'data'))).resolve()
IMAGES_DIR = DATA_DIR / 'pages'
CROPS_DIR = DATA_DIR / 'crops'
DB_PATH = DATA_DIR / 'audit.sqlite3'


def utcnow():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def init_storage():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    CROPS_DIR.mkdir(parents=True, exist_ok=True)
    with connection() as con:
        con.executescript('''
            CREATE TABLE IF NOT EXISTS pages (
              id TEXT PRIMARY KEY, filename TEXT NOT NULL, label TEXT NOT NULL,
              image_path TEXT NOT NULL, width INTEGER NOT NULL,
              height INTEGER NOT NULL, expected_numbers TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS questions (
              id TEXT PRIMARY KEY, page_id TEXT NOT NULL,
              number TEXT NOT NULL, bbox TEXT NOT NULL,
              image_path TEXT NOT NULL, latex TEXT NOT NULL DEFAULT '',
              engine_a TEXT NOT NULL DEFAULT '', engine_b TEXT NOT NULL DEFAULT '',
              ocr_warnings TEXT NOT NULL DEFAULT '[]',
              analysis TEXT NOT NULL DEFAULT '{}',
              status TEXT NOT NULL DEFAULT 'needs_review',
              reviewer TEXT NOT NULL DEFAULT '',
              checks TEXT NOT NULL DEFAULT '{}', notes TEXT NOT NULL DEFAULT '',
              source_error INTEGER NOT NULL DEFAULT 0,
              revision INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
              FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_question_page ON questions(page_id);
        ''')
        cols = {r['name'] for r in con.execute('PRAGMA table_info(pages)')}
        if 'expected_numbers' not in cols:
            con.execute("ALTER TABLE pages ADD COLUMN expected_numbers TEXT NOT NULL DEFAULT ''")


@contextmanager
def connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=20)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys = ON')
    con.execute('PRAGMA busy_timeout = 20000')
    try:
        yield con
        con.commit()
    finally:
        con.close()


def row_question(row):
    if row is None:
        return None
    q = dict(row)
    for col in ('bbox', 'ocr_warnings', 'analysis', 'checks'):
        q[col] = json.loads(q[col])
    q['source_error'] = bool(q['source_error'])
    return q


def list_questions(con):
    return [row_question(r) for r in con.execute(
        'SELECT * FROM questions ORDER BY created_at ASC, id ASC')]


def get_question(con, qid):
    return row_question(con.execute('SELECT * FROM questions WHERE id=?', (qid,)).fetchone())


def get_page(con, pid):
    row = con.execute('SELECT * FROM pages WHERE id=?', (pid,)).fetchone()
    return dict(row) if row else None
