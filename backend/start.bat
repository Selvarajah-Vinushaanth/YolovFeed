# Backend startup script
echo "Starting YOLO Object Detection API..."

# Create virtual environment if it doesn't exist
if not exist "venv" (
    echo "Creating virtual environment..."
    python -m venv venv
)

# Activate virtual environment
echo "Activating virtual environment..."
call venv\Scripts\activate.bat

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Download YOLO model if not exists
echo "Checking YOLO model..."
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Start the server
echo "Starting FastAPI server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000