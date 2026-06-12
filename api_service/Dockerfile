# Dockerfile for the TuskPoint API service.
# Works on Hugging Face Spaces (Docker SDK) and Koyeb. Build context = repo root:
#   docker build -f api_service/Dockerfile -t tuskpoint-api .
FROM python:3.11-slim

WORKDIR /app

# Install the engine package + the service deps.
COPY pyproject.toml README.md ./
COPY src ./src
COPY api_service ./api_service
RUN pip install --no-cache-dir . && \
    pip install --no-cache-dir -r api_service/requirements.txt

# HF Spaces injects $PORT (default 7860); default to 8000 elsewhere.
ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn api_service.app:app --host 0.0.0.0 --port ${PORT:-7860}"]
