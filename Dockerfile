    FROM node:22-slim AS frontend-build
    WORKDIR /app/frontend
    COPY frontend/package*.json ./
    RUN npm install
    COPY frontend/ ./
    RUN echo "VITE_API_URL=/" > .env
    RUN npm run build
    
    FROM python:3.10-slim
    
    ENV PYTHONDONTWRITEBYTECODE=1
    ENV PYTHONUNBUFFERED=1
    ENV TRANSFORMERS_CACHE=/tmp/cache 
    
    WORKDIR /app
    
    RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-vie \
        poppler-utils \
        libgl1 \
        libglib2.0-0 \
        build-essential \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*
    
    COPY backend/requirements.txt .
    RUN pip install --no-cache-dir --upgrade pip && \
        pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
        pip install --no-cache-dir "numpy<2.0" accelerate transformers sentence-transformers && \
        pip install --no-cache-dir -r requirements.txt
    
    COPY backend/ .
    
    RUN mkdir -p static
    COPY --from=frontend-build /app/frontend/dist ./static
    
    RUN mkdir -p data chroma_db /tmp/cache && chmod -R 777 /tmp/cache
    
    EXPOSE 80
    
    CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]