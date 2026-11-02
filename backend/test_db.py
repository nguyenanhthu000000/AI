from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

db = Chroma(
    persist_directory="chroma_db",
    embedding_function=embeddings
)

docs = db.get()

sources = set()

for m in docs["metadatas"]:
    sources.add(m["source"])

print("Files inside DB:")

for s in sources:
    print(s)