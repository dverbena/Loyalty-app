# Base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /

# Copy application code/conf/etc
COPY requirements.txt .
COPY gunicorn.conf.py .
COPY start.sh .
RUN chmod +x start.sh
COPY ./app ./app
COPY ./db ./db
COPY ./run.py ./run.py

# Install dependencies in one layer
RUN pip install --no-cache-dir -r requirements.txt

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean

# Default command
# CMD ["python", "run.py"]
CMD ["./start.sh"]


