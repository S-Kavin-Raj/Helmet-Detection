FROM python:3.10-slim

WORKDIR /app

# No system dependencies needed for opencv-python-headless!
# Keeps the image small and build fast.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default environment variables
ENV PORT=7860
# Enable low memory mode by default for containers to ensure it runs on free tiers
ENV LOW_MEMORY_MODE=true

EXPOSE 7860

# Run the application
CMD ["python", "run_production.py"]
