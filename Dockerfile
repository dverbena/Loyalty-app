# Base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /

# Install dependencies in one layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean

# Copy application code
COPY ./app ./app
COPY ./db ./db
COPY ./run.py ./run.py

# Default command
CMD ["python", "run.py"]

