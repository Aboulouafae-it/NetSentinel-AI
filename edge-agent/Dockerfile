FROM python:3.12-slim

WORKDIR /app

# Minimal requirements for agent
RUN pip install httpx pydantic

COPY . .

CMD ["python", "main.py"]
