@echo off
echo 🎯 YOLO Real-Time Object Detection Application
echo ==============================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed.

REM Create necessary directories
if not exist "backend\data" mkdir backend\data
if not exist "frontend\build" mkdir frontend\build

echo 📁 Created necessary directories.

REM Build and start services
echo 🚀 Building and starting services...
docker-compose up --build -d

echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak > nul

REM Check service status
echo 🔍 Checking service status...
docker-compose ps

echo.
echo 🎉 Application is ready!
echo.
echo 📱 Setup Instructions:
echo 1. Install 'IP Webcam' app on your phone
echo 2. Start the server in the app
echo 3. Note the IP address (e.g., 192.168.1.100)
echo 4. Open http://localhost in your browser
echo 5. Click 'Add Camera' and enter your phone's IP
echo.
echo 🌐 Application URLs:
echo    Frontend: http://localhost
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 📊 To view logs:
echo    docker-compose logs -f
echo.
echo 🛑 To stop the application:
echo    docker-compose down
echo.
pause