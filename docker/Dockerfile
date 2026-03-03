FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir "fastapi>=0.110.0" "uvicorn[standard]>=0.29.0" "sqlalchemy[asyncio]>=2.0.30" "asyncpg>=0.30.0" "psycopg2-binary>=2.9.9" "alembic>=1.13.0" "jinja2>=3.1.0" "passlib[bcrypt]>=1.7.4" "pydantic[email]>=2.0.0" "PyJWT>=2.8.0"

COPY . .

ENV PYTHONPATH=/app

EXPOSE 8111

CMD ["sh", "-c", "alembic upgrade head && uvicorn payment_verifier:app --host 0.0.0.0 --port 8111"]
