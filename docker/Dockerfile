# Build the TypeScript frontend bundle
FROM node:22-alpine AS frontend

WORKDIR /build
COPY package.json package-lock.json tsconfig.json ./
COPY payment_verifier/static/ts/ payment_verifier/static/ts/
RUN npm ci --ignore-scripts && npm run build

# Python application
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY . .
COPY --from=frontend /build/payment_verifier/static/js/ payment_verifier/static/js/

RUN pip install --no-cache-dir .

EXPOSE 8111

CMD ["sh", "-c", "alembic upgrade head && uvicorn payment_verifier:app --host 0.0.0.0 --port 8111"]
