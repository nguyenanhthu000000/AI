import sqlite3

DB_PATH = "chat_history.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Bảng lưu lịch sử chat (Không cần email, quản lý theo session_id)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question TEXT,
        answer TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Bảng quản lý người dùng (giữ nguyên cho các tab quản lý khác nếu cần)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT,
        fullname TEXT,
        avatar_url TEXT,
        birthday DATE,
        major TEXT DEFAULT 'Information Technology',
        university TEXT DEFAULT 'Van Lang University',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 3. Bảng lưu trữ nhiều CV theo session_id (Không cần email)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_cvs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        filename TEXT,
        cv_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
        INSERT OR IGNORE INTO users (email, fullname, major, university)
        VALUES (?, ?, ?, ?)
    """, ("thunguyen465933@gmail.com", "Anh Thư", "Information Technology", "Van Lang University"))

    # 4. Các bảng cũ được giữ nguyên vẹn 100%
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        company TEXT,
        description TEXT,
        required_skills TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        platform TEXT,
        skill_target TEXT,
        url TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_skills (
        email TEXT,
        skill_name TEXT,
        proficiency_level TEXT,
        PRIMARY KEY (email, skill_name)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        content TEXT,
        status TEXT DEFAULT 'Unread',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Khởi tạo cơ sở dữ liệu thành công!")