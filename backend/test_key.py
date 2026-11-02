import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print("Key đang đọc được:", api_key[:10] + "..." if api_key else "KHÔNG TÌM THẤY KEY!")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content("Xin chào, hãy trả lời ngắn gọn: Bạn là ai?")
print("Kết nối thành công! Phản hồi từ AI:", response.text)