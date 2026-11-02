from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import shutil
from typing import List, Optional
import uuid
from rag_engine import ask_question, db, reload_db
from ingest import ingest, ingest_single_file
from database import get_connection, init_db
from utils import process_user_cv, process_user_image

app = FastAPI()

# ================= 1. CẤU HÌNH HỆ THỐNG =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = "data"
UPLOAD_DIR = "static/uploads"
JOB_DIR = os.path.join(DATA_PATH, "job")
SKILL_DIR = os.path.join(DATA_PATH, "skill")
STUDENT_DIR = os.path.join(DATA_PATH, "student_profiles")

os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(JOB_DIR, exist_ok=True)
os.makedirs(SKILL_DIR, exist_ok=True)
os.makedirs(STUDENT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

init_db()

class UserProfile(BaseModel):
    email: str
    password: Optional[str] = None
    fullname: str
    avatar_url: Optional[str] = None
    birthday: Optional[str] = None
    major: str = "Information Technology"
    university: str = "Van Lang University"

class FeedbackRequest(BaseModel):
    email: str
    content: str
    image_url: Optional[str] = None

class UserSkillRequest(BaseModel):
    email: str
    skill_name: str
    proficiency_level: str

# ================= 2. API CHAT & QUẢN LÝ PHIÊN TRÒ CHUYỆN (CÓ LỌC THEO EMAIL) =================
@app.get("/health")
def health():
    return {"status": "running"}

@app.post("/chat")
async def chat(
    message: str = Form(...),
    session_id: Optional[str] = Form(None),
    email: Optional[str] = Form("thunguyen465933@gmail.com"),
    file: Optional[UploadFile] = File(None)
):
    try:
        file_msg = ""
        cv_context_override = None
        current_session_id = session_id if session_id else str(uuid.uuid4())
       
        if file:
            temp_dir = "temp"
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
           
            try:
                if file.filename.endswith(".pdf"):
                    cv_text = process_user_cv(temp_path)
                elif file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
                    cv_text = process_user_image(temp_path)
                else:
                    cv_text = "Tài liệu đính kèm từ người dùng."
                   
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                   
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO user_cvs (session_id, filename, cv_text)
                    VALUES (?, ?, ?)
                """, (current_session_id, file.filename, cv_text))
                conn.commit()
                conn.close()
               
                cv_context_override = cv_text
                file_msg = f"Đã tải lên và lưu thành công file '{file.filename}' cho đoạn chat này. "
            except Exception as ex:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                print("Lỗi xử lý file CV:", ex)

        if not cv_context_override:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT cv_text FROM user_cvs WHERE session_id = ? ORDER BY id DESC LIMIT 1", (current_session_id,))
            row = cursor.fetchone()
            conn.close()
            if row and row[0]:
                cv_context_override = row[0]

        # Tích hợp cơ chế dự phòng (Fallback) khi AI lỗi hoặc mất mạng
        try:
            result = ask_question(message, cv_context_override)
            final_answer = file_msg + result["answer"]
            suggestions = result.get("suggestions", [])
            sources = result.get("sources", [])
        except Exception as ai_error:
            print(f"⚠️ AI gặp sự cố hoặc mất kết nối: {ai_error}. Đang chuyển sang bộ gợi ý dự phòng (ChromaDB Fallback)...")
            docs = db.similarity_search(message, k=3)
            if docs:
                fallback_text = "⚠️ **Hệ thống AI hiện đang mất kết nối hoặc quá tải. Dưới đây là các kết quả gợi ý trực tiếp từ cơ sở dữ liệu hệ thống:**\n\n"
                sources_list = []
                for i, doc in enumerate(docs, 1):
                    source_name = doc.metadata.get("source", "Tài liệu nội bộ")
                    fallback_text += f"{i}. (Nguồn: *{source_name}*)\n{doc.page_content}\n\n"
                    if source_name not in sources_list:
                        sources_list.append(source_name)
                        
                final_answer = file_msg + fallback_text.strip()
                suggestions = ["Thử lại câu hỏi", "Xem danh sách việc làm", "Liên hệ quản trị viên"]
                sources = sources_list
            else:
                final_answer = file_msg + "⚠️ Hệ thống AI đang tạm thời gián đoạn và không tìm thấy dữ liệu gợi ý phù hợp trong cơ sở dữ liệu. Vui lòng thử lại sau ít phút!"
                suggestions = []
                sources = []
       
        # Lưu vào DB có kèm theo email để tách bạch tài khoản
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chats(session_id, question, answer, email) VALUES (?,?,?,?)",
            (current_session_id, message, final_answer, email)
        )
        conn.commit()
        conn.close()
       
        return {
            "answer": final_answer,
            "suggestions": suggestions,
            "sources": sources,
            "session_id": current_session_id
        }
    except Exception as e:
        print("Lỗi chat endpoint:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def history(email: Optional[str] = None, keyword: Optional[str] = None):
    try:
        conn = get_connection()
        cursor = conn.cursor()
       
        if email:
            if keyword:
                cursor.execute("""
                    SELECT session_id, MIN(question) as title, MAX(id) as last_id
                    FROM chats
                    WHERE email = ? AND (question LIKE ? OR answer LIKE ?)
                    GROUP BY session_id
                    ORDER BY last_id DESC LIMIT 50
                """, (email, f"%{keyword}%", f"%{keyword}%"))
            else:
                cursor.execute("""
                    SELECT session_id, MIN(question) as title, MAX(id) as last_id
                    FROM chats
                    WHERE email = ?
                    GROUP BY session_id
                    ORDER BY last_id DESC LIMIT 50
                """, (email,))
        else:
            cursor.execute("""
                SELECT session_id, MIN(question) as title, MAX(id) as last_id
                FROM chats
                GROUP BY session_id
                ORDER BY last_id DESC LIMIT 50
            """)
           
        data = cursor.fetchall()
        conn.close()
        return [{"session_id": row[0], "title": row[1] or "Cuộc trò chuyện mới"} for row in data]
    except Exception as e:
        print("Lỗi lấy history:", e)
        return []

@app.get("/history/{session_id}")
def get_session_messages(session_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, question, answer FROM chats WHERE session_id = ? ORDER BY id ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "question": r[1], "answer": r[2]} for r in rows]
    except:
        return []

@app.delete("/history/session/{session_id}")
def delete_session(session_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chats WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM user_cvs WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"message": "Session deleted"}

@app.delete("/history/{chat_id}")
def delete_chat(chat_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

# ================= 3. QUẢN LÝ FILE, OCR & AI =================
@app.get("/pdfs")
def list_pdfs():
    pdf_files = []
    if os.path.exists(DATA_PATH):
        for root, dirs, files in os.walk(DATA_PATH):
            for f in files:
                if f.lower().endswith(".pdf"):
                    pdf_files.append(f)
    return {"total_pdf": len(pdf_files), "pdf_files": list(set(pdf_files))}

@app.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: str = Form("job")
):
    target_folder = JOB_DIR
    if category == "skill":
        target_folder = SKILL_DIR
    elif category == "student_profiles":
        target_folder = STUDENT_DIR
       
    os.makedirs(target_folder, exist_ok=True)
    file_path = os.path.join(target_folder, file.filename)
   
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
       
    def background_ingest():
        try:
            success = ingest_single_file(file_path, file.filename, category)
            if success:
                reload_db()
                print(f"🤖 AI đã tự động học xong file: {file.filename}")
        except Exception as e:
            print("❌ Lỗi AI học ngầm:", e)
           
    background_tasks.add_task(background_ingest)
    return {
        "message": "Uploaded successfully. AI is learning in the background!",
        "filename": file.filename,
        "category": category
    }

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"message": "Image uploaded successfully", "url": f"/static/uploads/{file.filename}"}

@app.post("/chat-with-image")
async def chat_with_image(file: UploadFile = File(...), prompt: str = "Hãy phân tích yêu cầu tuyển dụng từ hình ảnh này:"):
    temp_img_path = os.path.join("temp", file.filename)
    os.makedirs("temp", exist_ok=True)
    with open(temp_img_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        extracted_text = process_user_image(temp_img_path)
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        if not extracted_text.strip():
            return {"answer": "Không thể trích xuất được văn bản từ hình ảnh này. Hãy thử ảnh rõ nét hơn nhé!", "sources": []}
        full_query = f"{prompt}\n\nNội dung trích xuất từ ảnh:\n{extracted_text[:3000]}"
        result = ask_question(full_query)
        return {
            "extracted_text": extracted_text,
            "answer": result["answer"],
            "sources": result.get("sources", [])
        }
    except Exception as e:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý hình ảnh: {str(e)}")

@app.delete("/file/{filename}")
def delete_file(filename: str):
    deleted = False
    if os.path.exists(DATA_PATH):
        for root, dirs, files in os.walk(DATA_PATH):
            if filename in files:
                path = os.path.join(root, filename)
                os.remove(path)
                deleted = True
    if deleted:
        return {"message": "Deleted"}
    return {"error": "Not found"}

@app.post("/rebuild")
def rebuild_database():
    ingest()
    reload_db()
    return {"message": "AI Rebuilt Successfully"}

# ================= 4. QUẢN LÝ NGƯỜI DÙNG & HỒ SƠ =================
@app.post("/user/update_profile")
def update_profile(profile: UserProfile):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO users (email, password, fullname, avatar_url, birthday, major, university)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (profile.email, profile.password, profile.fullname, profile.avatar_url, profile.birthday, profile.major, profile.university))
    conn.commit()
    conn.close()
    return {"message": "Profile updated successfully"}

@app.get("/user/profile")
def get_profile(email: str = Query(...)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, fullname, avatar_url, birthday, major, university FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "email": row[0],
            "fullname": row[1],
            "avatar_url": row[2],
            "birthday": row[3],
            "major": row[4],
            "university": row[5]
        }
    raise HTTPException(status_code=404, detail="User not found")

@app.get("/admin/users")
def get_all_users():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT email, fullname, birthday, major, university FROM users")
        rows = cursor.fetchall()
        conn.close()
        return [{"email": r[0], "fullname": r[1], "birthday": r[2], "major": r[3], "university": r[4]} for r in rows]
    except:
        return []

@app.delete("/admin/user/{email}")
def delete_user(email: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
    conn.commit()
    conn.close()
    return {"message": "User deleted"}

# ================= 5. KỸ NĂNG & FEEDBACK =================
@app.post("/user/skill")
def add_user_skill(skill: UserSkillRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO user_skills (email, skill_name, proficiency_level)
        VALUES (?, ?, ?)
    """, (skill.email, skill.skill_name, skill.proficiency_level))
    conn.commit()
    conn.close()
    return {"message": "Skill added successfully"}

@app.get("/user/skills")
def get_user_skills(email: str = Query(...)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT skill_name, proficiency_level FROM user_skills WHERE email = ?", (email,))
    rows = cursor.fetchall()
    conn.close()
    return [{"skill_name": r[0], "proficiency_level": r[1]} for r in rows]

@app.post("/feedback")
def submit_feedback(fb: FeedbackRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO feedbacks (email, content, image_url) VALUES (?, ?, ?)",
        (fb.email, fb.content, fb.image_url)
    )
    conn.commit()
    conn.close()
    return {"message": "Feedback submitted successfully"}

@app.get("/admin/feedbacks")
def get_all_feedbacks():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, content, status, created_at, image_url FROM feedbacks ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "email": r[1],
            "content": r[2],
            "status": r[3],
            "created_at": r[4],
            "image_url": r[5] or ""
        }
        for r in rows
    ]

# ================= 6. ANALYTICS & MATCHING CV =================
@app.get("/analytics")
def analytics():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT question, COUNT(*) as total
        FROM chats
        GROUP BY question
        ORDER BY total DESC
        LIMIT 10
    """)
    data = cursor.fetchall()
    conn.close()
    return data

@app.post("/match-cv")
async def match_cv_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file CV định dạng .pdf")
    temp_path = os.path.join("temp", file.filename)
    os.makedirs("temp", exist_ok=True)
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        cv_text = process_user_cv(temp_path)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if len(cv_text.strip()) < 30:
            return {
                "answer": "⚠️ File PDF này có vẻ là bản scan mờ hoặc không đọc được văn bản. Bạn vui lòng kiểm tra lại file CV nhé!",
                "sources": []
            }
        query = f"Hãy phân tích CV sau đây và phân tích các việc làm phù hợp nhất, chỉ ra kỹ năng còn thiếu:\n\n{cv_text[:3000]}"
        result = ask_question(query)
        return result
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý CV: {str(e)}")

# ================= 7. GIAO DIỆN (FRONTEND) =================
if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def serve_home():
    return FileResponse("static/index.html")

@app.get("/favicon.ico")
async def favicon():
    if os.path.exists("static/favicon.ico"):
        return FileResponse("static/favicon.ico")
    return FileResponse("static/index.html")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join("static", full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("static/index.html")

@app.delete("/admin/feedback/{feedback_id}")
def delete_feedback(feedback_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM feedbacks WHERE id = ?", (feedback_id,))
    conn.commit()
    conn.close()
    return {"message": "Feedback deleted successfully"}