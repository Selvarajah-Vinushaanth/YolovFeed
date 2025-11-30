# Development Environment Setup

## Backend Development

### Prerequisites
- Python 3.9+
- pip

### Setup
```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### Run Development Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend Development

### Prerequisites
- Node.js 16+
- npm

### Setup
```bash
cd frontend
npm install
```

### Run Development Server
```bash
npm start
```

The frontend will be available at http://localhost:3000

## Production Deployment

### Using Docker (Recommended)
```bash
# Make sure Docker and Docker Compose are installed
docker-compose up --build -d
```

### Manual Deployment

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run build

# Serve the build folder with a web server
# For example, using Python's built-in server:
cd build
python -m http.server 80
```

## Environment Variables

### Backend
- `ENVIRONMENT`: production/development
- `DATABASE_URL`: SQLite database path (default: ./cameras.db)

### Frontend
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8000)

## Troubleshooting

### Common Issues

1. **Camera connection failed**
   - Make sure your phone and computer are on the same network
   - Check if the IP Webcam app is running on your phone
   - Verify the IP address and port

2. **YOLO model download issues**
   - The first run will download the YOLO model (~6MB)
   - Ensure you have a stable internet connection
   - Check if you have sufficient disk space

3. **WebSocket connection issues**
   - Check if port 8000 is not blocked by firewall
   - Verify the WebSocket URL in the frontend configuration

4. **Performance issues**
   - Reduce the number of concurrent camera streams
   - Use a smaller YOLO model (yolov8n.pt instead of yolov8x.pt)
   - Lower the frame resolution in camera settings

### Logs

#### Docker
```bash
docker-compose logs -f
```

#### Development
- Backend logs appear in the terminal running uvicorn
- Frontend logs appear in the browser console (F12)