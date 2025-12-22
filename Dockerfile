FROM python:3.10-slim

WORKDIR /app

# Install critical system dependencies for Ultralytics/OpenCV
# strict-ssl=false helps with some corporate/cloud firewall issues
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default environment variables
ENV PORT=7860
ENV LOW_MEMORY_MODE=true

EXPOSE 7860

CMD ["python", "run_production.py"]
