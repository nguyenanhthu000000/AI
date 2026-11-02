import google.generativeai as genai

# Dán key chuẩn của em vào đây
genai.configure(api_key="AIzaSy_key_chuẩn_của_em_vào_đây")

print("🔍 Danh sách các model Gemini khả dụng với key của bạn:")
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(f"- {m.name}")