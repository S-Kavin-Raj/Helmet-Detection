FROM python:3.10-slim

WORKDIR /app

# Install GL dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default environment variables
ENV PORT=5000
# Enable low memory mode by default for containers to ensure it runs on free tiers (512MB RAM)
ENV LOW_MEMORY_MODE=true

EXPOSE 5000

# Run the application
CMD ["python", "run_production.py"]
