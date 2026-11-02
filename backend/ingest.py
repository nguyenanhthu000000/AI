import os
import shutil
import pytesseract
import re
from PIL import Image
from pdf2image import convert_from_path
from langchain_community.document_loaders import PyPDFLoader, TextLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import platform
from dotenv import load_dotenv

# Tải biến môi trường từ file .env
load_dotenv()

# Đọc đường dẫn tesseract linh hoạt
tesseract_path = os.getenv("TESSERACT_CMD")
if tesseract_path:
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

# 3 thư mục dữ liệu nền tảng của hệ thống
DATA_FOLDERS = {
    "job": "data/job",
    "skill": "data/skill",
    "student_profiles": "data/student_profiles"
}
DB_PATH = "chroma_db"

def normalize_text(text):
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\b\w\b\s+){2,}\b\w\b", lambda m: m.group(0).replace(" ", ""), text)
    fixes = {
        "TrtrdNG": "Trường",
        "Gidm": "Giám",
        "DUG": "DỤC",
        "Cdc": "Các",
        "Lim": "Lưu",
    }
    for k, v in fixes.items():
        text = text.replace(k, v)
    return text.strip()

# ================= OCR DÀNH RIÊNG CHO TÀI LIỆU PDF SCAN TRONG DATA =================
def extract_text_from_scan(pdf_path, filename):
    print("Running OCR for PDF:", filename)
    
    # Đọc đường dẫn poppler linh hoạt qua biến môi trường (không hardcode)
    poppler_path = os.getenv("POPPLER_PATH")
    
    if platform.system() == "Windows":
        if poppler_path:
            images = convert_from_path(pdf_path, poppler_path=poppler_path)
        else:
            images = convert_from_path(pdf_path)
    else:
        images = convert_from_path(pdf_path)
        
    docs = []
    for i, img in enumerate(images):
        img = img.convert("L")  
        img = img.point(lambda x: 0 if x < 150 else 255)
        img = img.resize((img.width * 2, img.height * 2))
        text = pytesseract.image_to_string(
            img,
            lang="vie+eng",
            config="--oem 3 --psm 4"
        )
        text = normalize_text(text)
        docs.append(
            Document(
                page_content=text,
                metadata={
                    "source": filename,
                    "page": i + 1
                }
            )
        )
    return docs

# ================= OCR DÀNH RIÊNG CHO ẢNH TÀI LIỆU TRONG DATA =================
def extract_text_from_image(image_path, filename):
    print("Running OCR for Image:", filename)
    docs = []
    try:
        img = Image.open(image_path).convert("L")
        img = img.point(lambda x: 0 if x < 150 else 255)
       
        text = pytesseract.image_to_string(
            img,
            lang="vie+eng",
            config="--oem 3 --psm 4"
        )
        text = normalize_text(text)
        docs.append(
            Document(
                page_content=text,
                metadata={
                    "source": filename,
                    "page": 1
                }
            )
        )
    except Exception as e:
        print(f"Lỗi khi đọc ảnh {filename}: {e}")
       
    return docs

# ================= HÀM NẠP RIÊNG CHO 1 FILE MỚI (SIÊU NHANH) =================
def ingest_single_file(file_path: str, filename: str, category: str):
    print(f"\n🚀 Đang xử lý nhanh file mới: {filename} (Category: {category})")
    file_docs = []
    try:
        if filename.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
            pages = loader.load()
            text_length = sum(len(p.page_content.strip()) for p in pages)
            if text_length < 50:
                print("⚠️ File PDF không có lớp text (scan ảnh), đang chạy OCR...")
                file_docs.extend(extract_text_from_scan(file_path, filename))
            else:
                print("⚡ Đọc text PDF trực tiếp (Siêu nhanh)")
                file_docs.extend(pages)
        elif filename.endswith(".txt"):
            txt_loader = TextLoader(file_path, encoding="utf-8")
            file_docs.extend(txt_loader.load())
        elif filename.endswith(".csv"):
            csv_loader = CSVLoader(file_path, encoding="utf-8")
            file_docs.extend(csv_loader.load())
        elif filename.lower().endswith((".png", ".jpg", ".jpeg")):
            file_docs.extend(extract_text_from_image(file_path, filename))
        else:
            print("❌ Định dạng file không hỗ trợ!")
            return False

        for d in file_docs:
            d.metadata["source"] = filename
            d.metadata["category"] = category

        if not file_docs:
            print("⚠️ Không trích xuất được nội dung từ file này.")
            return False

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100
        )
        chunks = splitter.split_documents(file_docs)
        print(f"📦 Tạo thành công {len(chunks)} chunks cho file này.")

        embeddings = HuggingFaceEmbeddings(
            model_name="bkai-foundation-models/vietnamese-bi-encoder",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"batch_size": 32}
        )
        db = Chroma(
            persist_directory=DB_PATH,
            embedding_function=embeddings
        )
        db.add_documents(chunks)
        print(f"✅ Đã nạp thành công file {filename} vào ChromaDB!")
        return True
    except Exception as e:
        print(f"❌ Lỗi xử lý file {filename}: {e}")
        return False

# ================= HÀM CHÍNH NẠP DỮ LIỆU TOÀN BỘ (INGEST) =================
def ingest():
    docs = []
    existing_sources = set()
    embeddings = HuggingFaceEmbeddings(
        model_name="bkai-foundation-models/vietnamese-bi-encoder",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"batch_size": 32}
    )
    if os.path.exists(DB_PATH):
        try:
            db = Chroma(
                persist_directory=DB_PATH,
                embedding_function=embeddings
            )
            data = db.get()
            if data and data.get("metadatas"):
                existing_sources = set(
                    m.get("source", "") for m in data["metadatas"] if m
                )
            print("Existing files in DB:", existing_sources)
        except Exception as e:
            print("Cannot load existing DB:", e)

    for category, folder_path in DATA_FOLDERS.items():
        if not os.path.exists(folder_path):
            print(f"Thư mục {folder_path} chưa tồn tại, đang tự động tạo mới...")
            os.makedirs(folder_path, exist_ok=True)
            continue
        print(f"\n--- Đang quét thư mục: {folder_path} (Category: {category}) ---")
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            if os.path.isdir(file_path):
                continue
            if file in existing_sources:
                print("Skipping (already in DB):", file)
                continue
            print("\nProcessing file:", file)
            file_docs = []
            if file.endswith(".pdf"):
                loader = PyPDFLoader(file_path)
                pages = loader.load()
                text_length = sum(len(p.page_content.strip()) for p in pages)
                if text_length < 50:
                    print("⚠️ File PDF không có lớp text (scan ảnh), đang chạy OCR...")
                    file_docs.extend(extract_text_from_scan(file_path, file))
                else:
                    print("⚡ Đọc text PDF trực tiếp (Siêu nhanh)")
                    file_docs.extend(pages)
            elif file.endswith(".txt"):
                txt_loader = TextLoader(file_path, encoding="utf-8")
                file_docs.extend(txt_loader.load())
            elif file.endswith(".csv"):
                csv_loader = CSVLoader(file_path, encoding="utf-8")
                file_docs.extend(csv_loader.load())
            elif file.lower().endswith((".png", ".jpg", ".jpeg")):
                file_docs.extend(extract_text_from_image(file_path, file))
            else:
                continue
            for d in file_docs:
                d.metadata["source"] = file
                d.metadata["category"] = category
            docs.extend(file_docs)

    print("\nTotal new pages/documents loaded:", len(docs))
    if not docs:
        print("No new documents to ingest")
        return
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )
    chunks = splitter.split_documents(docs)
    print("Total chunks created:", len(chunks))
    db = Chroma(
        persist_directory=DB_PATH,
        embedding_function=embeddings
    )
    db.add_documents(chunks)
    print("\nIngest completed successfully with 3 Core Categories!")

if __name__ == "__main__":
    ingest()