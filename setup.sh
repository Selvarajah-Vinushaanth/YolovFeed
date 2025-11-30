#!/bin/bash

# YOLO Object Detection Application Setup Script

echo "🎯 YOLO Real-Time Object Detection Application"
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed."

# Create necessary directories
mkdir -p backend/data
mkdir -p frontend/build

echo "📁 Created necessary directories."

# Set permissions
chmod +x backend/start.bat
chmod +x setup.sh

echo "🔧 Set file permissions."

# Build and start services
echo "🚀 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Application is ready!"
echo ""
echo "📱 Setup Instructions:"
echo "1. Install 'IP Webcam' app on your phone"
echo "2. Start the server in the app"
echo "3. Note the IP address (e.g., 192.168.1.100)"
echo "4. Open http://localhost in your browser"
echo "5. Click 'Add Camera' and enter your phone's IP"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop the application:"
echo "   docker-compose down"
echo ""