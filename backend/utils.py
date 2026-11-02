import os
import pytesseract
import re
from PIL import Image
from pdf2image import convert_from_path
from pypdf import PdfReader
import platform
from dotenv import load_dotenv

# Tải biến môi trường từ file .env
load_dotenv()

# Đọc đường dẫn tesseract linh hoạt
tesseract_path = os.getenv("TESSERACT_CMD")
if tesseract_path:
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

def clean_text(text):
    """Làm sạch văn bản sau khi OCR hoặc đọc PDF"""
    if not text:
        return ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def process_user_cv(pdf_path):
    """
    Xử lý file PDF CV do sinh viên upload:
    - Thử đọc trực tiếp bằng pypdf trước.
    - Nếu file PDF là dạng ảnh scan (không có text), tự động chuyển qua OCR.
    """
    print(f"Đang xử lý CV của sinh viên từ file: {pdf_path}")
    text = ""
    try:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + " "
        
        text = clean_text(text)
        
        # Nếu đọc ra quá ít chữ (PDF dạng ảnh scan) -> Chạy OCR dự phòng
        if len(text) < 50:
            print("PDF dạng ảnh scan, đang chuyển sang chạy OCR cho người dùng...")
            
            # Đọc đường dẫn poppler linh hoạt qua biến môi trường (không hardcode)
            poppler_path = os.getenv("POPPLER_PATH")
            
            if platform.system() == "Windows":
                if poppler_path:
                    images = convert_from_path(pdf_path, poppler_path=poppler_path)
                else:
                    images = convert_from_path(pdf_path)
            else:
                images = convert_from_path(pdf_path)
                
            ocr_text = ""
            for img in images:
                img = img.convert("L")
                text_page = pytesseract.image_to_string(img, lang="vie+eng", config="--oem 3 --psm 4")
                ocr_text += text_page + " "
            text = clean_text(ocr_text)
            
    except Exception as e:
        print(f"Lỗi khi đọc file CV: {e}")
        
    return text

def process_user_image(image_path):
    """
    Xử lý file ảnh (PNG, JPG) do sinh viên upload (ví dụ: ảnh chụp JD tuyển dụng):
    - Dùng Tesseract OCR để trích xuất toàn bộ chữ tiếng Việt và tiếng Anh.
    """
    print(f"Đang chạy OCR cho ảnh do người dùng upload: {image_path}")
    try:
        img = Image.open(image_path).convert("L")
        img = img.point(lambda x: 0 if x < 150 else 255)
        
        text = pytesseract.image_to_string(
            img,
            lang="vie+eng",
            config="--oem 3 --psm 4"
        )
        return clean_text(text)
    except Exception as e:
        print(f"Lỗi khi xử lý ảnh người dùng: {e}")
        return ""