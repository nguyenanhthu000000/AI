from ingest import normalize_text, is_broken_text
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("data/060724_829_TB Ngung nhan CCAV Toefl ibt.pdf")
pages = loader.load()

raw_text = " ".join(p.page_content for p in pages)

print("Broken:", is_broken_text(raw_text))

for p in pages:
    clean = normalize_text(p.page_content)
    print("\nCLEAN CONTENT:\n")
    print(clean[:3500])