import os
import requests
import traceback
from typing import Optional
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from web_search_service import search_targeted_web

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

DB_PATH = "chroma_db"
embeddings = HuggingFaceEmbeddings(
    model_name="bkai-foundation-models/vietnamese-bi-encoder",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"batch_size": 32}
)

def get_vector_db():
    if not os.path.exists(DB_PATH) or not os.listdir(DB_PATH):
        return None
    try:
        return Chroma(
            persist_directory=DB_PATH,
            embedding_function=embeddings
        )
    except Exception as e:
        print(f"⚠️ Lỗi kết nối ChromaDB: {e}")
        return None

db = get_vector_db()

def get_retriever():
    global db
    if db is None:
        db = get_vector_db()
    if db is not None:
        return db.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": 3,
                "fetch_k": 5,
                "lambda_mult": 0.7
            }
        )
    return None

retriever = get_retriever()

def ask_question(question: str, user_cv_context: Optional[str] = None):
    try:
        q_lower = question.lower().strip()
        
        greetings = ["chào", "hi", "hello", "xin chào", "chào bạn", "alo", "hey"]
        if q_lower in greetings or len(q_lower) <= 3:
            return {
                "answer": "Xin chào! Mình là trợ lý AI tư vấn nghề nghiệp. Bạn muốn tôi hỗ trợ gì hôm nay?",
                "suggestions": [
                    "Phân tích CV của tôi",
                    "Tìm việc làm Python Developer mới nhất",
                    "Lộ trình học AI Engineer cần những gì?"
                ],
                "sources": []
            }
            
        intent = "GENERAL"
        is_personal_query = any(k in q_lower for k in ["cv của tôi", "tôi hợp", "tôi thiếu", "đánh giá hộ", "so với job"])
        
        if any(k in q_lower for k in ["tìm việc", "tuyển dụng", "job", "lương"]):
            intent = "JOB"
        elif any(k in q_lower for k in ["khóa học", "lộ trình", "học ở đâu"]):
            intent = "COURSE"
        elif any(k in q_lower for k in ["cv", "thiếu", "kỹ năng"]) or is_personal_query:
            intent = "SKILL_GAP"
            
        live_context = ""
        live_sources = []
        local_context = user_cv_context if user_cv_context else ""
        
        if not local_context:
            current_retriever = get_retriever()
            if current_retriever:
                docs = current_retriever.invoke(question)
                if docs:
                    local_context = "\n\n".join([d.page_content[:1500] for d in docs[:2]])
                    
        if intent == "JOB" and not is_personal_query:
            live_context, live_sources = search_targeted_web(question, category="job")
        elif intent == "COURSE":
            live_context, live_sources = search_targeted_web(question, category="course")
        elif intent == "SKILL_GAP" and not local_context:
            live_context, live_sources = search_targeted_web(f"kỹ năng khóa học {question}", category="course")
            
        all_sources = list(set(live_sources))
        
        prompt = f"""
Bạn là Trợ lý AI tư vấn nghề nghiệp thân thiện và chuyên nghiệp.
Nhiệm vụ: Trả lời câu hỏi của người dùng một cách rõ ràng, mạch lạc, đúng trọng tâm.
Nếu người dùng hỏi về CV hoặc kỹ năng cá nhân, hãy dựa vào thông tin hồ sơ dưới đây để đánh giá chi tiết điểm mạnh và điểm thiếu sót.
--- THÔNG TIN HỒ SƠ / CV CỦA NGƯỜI DÙNG ---
{local_context if local_context else "Chưa có thông tin CV hoặc tài liệu đính kèm trong phiên làm việc này."}
--- THÔNG TIN THỊ TRƯỜNG / TÀI LIỆU THAM KHẢO ---
{live_context if live_context else "Không có dữ liệu web phụ trợ."}
CÂU HỎI CỦA NGƯỜI DÙNG:
{question}
TRẢ LỜI BẰNG MARKDOWN TRÌNH BÀY ĐẸP MẮT, THÂN THIỆN:
"""

        # Danh sách các model dự phòng để tự động thử lần lượt nếu model trước lỗi
        models_to_try = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-pro"]
        res_data = None
        success = False

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"            
            print(f"🚀 Đang thử gửi request tới Google API với model: {model_name}...")
            
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=20)
                print(f"📥 Trạng thái phản hồi từ Google ({model_name}):", response.status_code)
                
                if response.status_code == 200:
                    res_data = response.json()
                    if "candidates" in res_data:
                        success = True
                        break
                    else:
                        print(f"⚠️ Model {model_name} trả về thiếu 'candidates': {res_data}")
                else:
                    print(f"⚠️ Model {model_name} lỗi HTTP {response.status_code}: {response.text}")
            except Exception as req_err:
                print(f"⚠️ Lỗi kết nối khi gọi {model_name}: {req_err}")

        if not success or not res_data:
            raise Exception("Tất cả các model Gemini đều từ chối hoặc không phản hồi thành công.")
            
        answer_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
        
        suggestions = [
            "Gợi ý việc làm phù hợp với tôi",
            "Tôi cần cải thiện kỹ năng gì thêm?",
            "Xem lộ trình học tập chi tiết"
        ]
            
        return {
            "answer": answer_text,
            "suggestions": suggestions,
            "sources": all_sources
        }

    except Exception as e:
        print("\n❌ LỖI THỰC TẾ TRONG ask_question:", str(e))
        print("❌ TRACEBACK CHI TIẾT:")
        traceback.print_exc()
        print("-" * 50)
        
        # Nhờ có cơ chế Fallback ở file main.py, nếu hàm này raise/return thì main.py sẽ hứng
        # hoặc trả về fallback answer cấu trúc chuẩn:
        fallback_answer = (
            "⚠️ **Hệ thống tư vấn AI hiện đang bận hoặc gián đoạn kết nối.**\n\n"
            "Dựa trên dữ liệu hồ sơ và danh mục gợi ý có sẵn, bạn có thể tham khảo một số hướng sau:\n"
            "* **Kiểm tra độ phù hợp CV:** Hãy đảm bảo CV bổ sung đầy đủ các từ khóa về kỹ năng chuyên môn (Python, SQL, React...).\n"
            "* **Bổ sung kỹ năng:** Tham khảo các khóa học ngắn hạn về Cấu trúc dữ liệu & Thuật toán, SQL Nâng cao, hoặc Web Frameworks.\n"
            "* **Việc làm gợi ý:** Hãy thử tìm kiếm các vị trí *Fresher/Junior Developer* phù hợp với bộ kỹ năng hiện có của bạn."
        )
        return {
            "answer": fallback_answer,
            "suggestions": ["Phân tích lại CV", "Tìm việc làm IT", "Lộ trình học tập"],
            "sources": []
        }

def reload_db():
    global db, retriever
    db = None
    db = get_vector_db()
    retriever = get_retriever()
    print("🔄 Đã làm mới kết nối ChromaDB thành công!")