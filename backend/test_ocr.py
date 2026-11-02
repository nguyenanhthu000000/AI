import os
import pytesseract
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

tesseract_path = os.getenv("TESSERACT_CMD")
if tesseract_path:
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

img = Image.open("test.png")
text = pytesseract.image_to_string(img, lang="vie")
print(text)