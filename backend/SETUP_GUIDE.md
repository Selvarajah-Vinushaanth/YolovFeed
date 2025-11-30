# YOLO Detection System with Cloud Database & AI Assistant

## Overview
This system now uses **Google Cloud Firestore** as the database and **Google Gemini AI** for the LLM assistant. This provides:
- Real-time cloud storage for all camera data
- Scalable analytics storage
- Intelligent assistant to analyze your detection data
- No local database files

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Google Cloud Setup

#### A. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Note your **Project ID**

#### B. Enable APIs
Enable these APIs in your project:
1. **Firestore API** (for database)
2. **Generative AI API** (for Gemini)

#### C. Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create new service account
3. Add these roles:
   - `Cloud Datastore User` (for Firestore)
   - `Generative AI Editor` (for Gemini)
4. Create and download JSON key file
5. Save as `firebase-service-account.json` in backend folder

#### D. Get API Keys
1. Go to APIs & Services > Credentials
2. Create API Key for Gemini AI
3. Restrict key to Generative AI API

### 3. Environment Configuration

Create `.env` file in backend folder:
```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
GOOGLE_API_KEY=your-gemini-api-key-here
```

Replace:
- `your-project-id-here` with your Google Cloud project ID
- `your-gemini-api-key-here` with your Gemini API key

### 4. Firestore Database Setup

#### Auto-creation (Recommended)
The application will automatically create these collections when first used:
- `cameras` - Camera configurations
- `analytics` - Real-time detection data
- `hourly_analytics` - Aggregated hourly data
- `chat_history` - LLM conversation history

#### Manual Setup (Optional)
If you prefer to set up manually:
1. Go to Firestore in Google Cloud Console
2. Create database in Native mode
3. Collections will be created automatically on first use

### 5. Run the Application

```bash
cd backend
python main.py
```

The server will start on `http://localhost:8000`

### 6. Test the Setup

Check if everything is working:
```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "services": {
    "yolo_model": "✅",
    "firestore": "✅", 
    "gemini_ai": "✅"
  }
}
```

## New Features

### 🤖 AI Assistant
- Chat with your detection data: `POST /chat`
- Ask questions like:
  - "What objects were detected most today?"
  - "Show me analytics for camera 1"
  - "What are the trends in detections?"

### ☁️ Cloud Database
- All data stored in Google Cloud Firestore
- Real-time synchronization
- Automatic scaling
- No local database files

### 📊 Enhanced Analytics
- Real-time analytics storage
- Hourly aggregations
- Historical data analysis
- Chat history tracking

## API Endpoints

### Chat Assistant
- `POST /chat` - Chat with AI assistant
  ```json
  {
    "message": "What objects were detected today?",
    "camera_id": "optional-camera-id"
  }
  ```

### Camera Management
- `GET /cameras` - List all cameras
- `POST /cameras` - Add new camera
- `DELETE /cameras/{id}` - Remove camera
- `POST /cameras/{id}/start` - Start streaming
- `POST /cameras/{id}/stop` - Stop streaming

### Analytics
- `GET /analytics/{camera_id}` - Get detection analytics
- `GET /analytics/{camera_id}/hourly` - Get hourly analytics

### System
- `GET /health` - System health check
- `GET /debug/database/{camera_id}` - Debug database contents

## Troubleshooting

### Common Issues

1. **Firestore Connection Failed**
   - Check your project ID in `.env`
   - Verify service account JSON file path
   - Ensure Firestore API is enabled

2. **Gemini AI Not Working**
   - Check your API key in `.env`
   - Verify Generative AI API is enabled
   - Check API key restrictions

3. **YOLO Model Issues**
   - Ensure `yolov8n.pt` is in backend folder
   - Check internet connection for model download

### Logs
Check the console output for detailed error messages and connection status.

## Cost Considerations

### Firestore Pricing
- **Reads**: $0.036 per 100K operations
- **Writes**: $0.108 per 100K operations
- **Storage**: $0.108 per GB/month

For a typical 5-camera setup with detection every 100ms:
- ~43K writes per hour per camera
- ~215K writes per hour total
- Estimated cost: ~$5-10/month

### Gemini AI Pricing
- **Gemini Pro**: $0.50 per 1M input tokens
- **Chat responses**: ~100-500 tokens each
- Estimated cost: Very minimal for typical usage

## Next Steps

1. **Frontend Integration**: Update frontend to use new chat API
2. **Advanced Analytics**: Add custom analytics queries
3. **Real-time Dashboard**: Create live analytics dashboard
4. **Mobile App**: Build mobile app using Firebase SDKs

## Benefits of This Setup

✅ **Scalable**: Handles multiple cameras and high-frequency data  
✅ **Real-time**: Live updates across all connected clients  
✅ **Intelligent**: AI assistant analyzes your data  
✅ **Cloud-native**: No local database maintenance  
✅ **Secure**: Google Cloud security and authentication  
✅ **Analytics-ready**: Rich querying and aggregation capabilities  