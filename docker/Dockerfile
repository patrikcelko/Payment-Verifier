FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

COPY . .

ENV PYTHONPATH=/app

EXPOSE 8111

CMD ["sh", "-c", "alembic upgrade head && uvicorn payment_verifier:app --host 0.0.0.0 --port 8111"]
