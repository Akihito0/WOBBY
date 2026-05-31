FROM python:3.11-slim

# Install system dependencies for OpenCV and MediaPipe
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Verify mediapipe loads correctly
RUN python -c "import mediapipe as mp; print('solutions' in dir(mp)); print(mp.__version__)"

COPY server.py .

EXPOSE 8765

CMD ["python", "server.py"]
