from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.background import BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import json
import cv2
import numpy as np
from ultralytics import YOLO
from datetime import datetime, timedelta
import base64
from typing import Dict, List, Optional
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv
from google.cloud import firestore
import google.generativeai as genai
from google.cloud.firestore import AsyncClient, Query
import firebase_admin
from firebase_admin import credentials, auth

# Initialize FastAPI app
app = FastAPI(title="YOLO Object Detection API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://1gzfvwcr-3000.asse.devtunnels.ms"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model
try:
    model = YOLO('yolov8n.pt')  # You can use yolov8s.pt, yolov8m.pt, yolov8l.pt, yolov8x.pt for better accuracy
    print("YOLO model loaded successfully")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    model = None

# Load environment variables
load_dotenv()

# Google Cloud Configuration
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
GOOGLE_API_KEY = "AIza################################"

# Initialize Firebase Admin SDK
try:
    # Check if Firebase app is already initialized
    if not firebase_admin._apps:
        # Use the service account key file
        service_account_path = "detect-da43f-firebase-adminsdk-fbsvc-75c3b85e23.json"
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized with service account")
        else:
            # Fallback to default credentials
            firebase_admin.initialize_app()
            print("Firebase Admin SDK initialized with default credentials")
    else:
        print("Firebase Admin SDK already initialized")
except Exception as e:
    print(f"Warning: Firebase Admin SDK initialization failed: {e}")

# Security scheme for authentication
security = HTTPBearer()

# Authentication middleware
async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase ID token"""
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

# Optional authentication dependency for development
async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from Firebase token"""
    try:
        # In development, you might want to skip authentication
        if os.getenv("SKIP_AUTH", "false").lower() == "true":
            return {"uid": "dev_user", "email": "dev@example.com"}
        
        decoded_token = await verify_firebase_token(credentials)
        return decoded_token
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# Initialize Firestore
try:
    if PROJECT_ID:
        db = firestore.AsyncClient(project=PROJECT_ID)
        print(f"Firestore client initialized for project: {PROJECT_ID}")
    else:
        print("Warning: GOOGLE_CLOUD_PROJECT_ID not found in environment")
        db = None
except Exception as e:
    print(f"Error initializing Firestore: {e}")
    db = None

# Initialize Gemini AI
try:
    if GOOGLE_API_KEY:
        from google import genai
        # Initialize the Gemini client
        gemini_client = genai.Client()
        print("Gemini AI client initialized successfully")
    else:
        print("Warning: GOOGLE_API_KEY not found in environment")
        gemini_client = None
except Exception as e:
    print(f"Error initializing Gemini AI client: {e}")
    gemini_client = None

# Firestore Collections
# Collections will be created automatically when first document is added:
# - cameras: camera configuration
# - detections: individual object detections
# - analytics: aggregated analytics data
# - hourly_analytics: hourly aggregated data
# - chat_history: LLM assistant conversation history

async def init_firestore_collections():
    """Initialize Firestore collections if they don't exist"""
    if not db:
        print("Firestore client not initialized")
        return
    
    print("Firestore collections will be created automatically when first documents are added")
    print("Collections: cameras, detections, analytics, hourly_analytics, chat_history")

# Pydantic models
class Camera(BaseModel):
    name: str
    ip_address: str
    port: Optional[int] = 8080

class CameraResponse(BaseModel):
    id: str
    name: str
    ip_address: str
    port: int
    is_active: bool
    created_at: str

class ChatMessage(BaseModel):
    message: str
    camera_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str

# Global variables
active_cameras = {}
detection_enabled = {}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Camera management functions
def get_camera_stream_url(ip_address: str, port: int) -> str:
    """Generate IP Webcam stream URL"""
    return f"http://{ip_address}:{port}/video"

async def process_camera_frame(camera_id: str, ip_address: str, port: int):
    """Process frames from IP camera"""
    stream_url = get_camera_stream_url(ip_address, port)
    
    try:
        cap = cv2.VideoCapture(stream_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        while camera_id in active_cameras and active_cameras[camera_id]:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(1)
                continue
            
            # Resize frame for processing
            frame = cv2.resize(frame, (640, 480))
            
            # Object detection if enabled
            if detection_enabled.get(camera_id, False) and model:
                results = model(frame)
                
                # Process detections
                object_counts = {}
                detections_data = []
                
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            # Extract detection data
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            confidence = box.conf[0].cpu().numpy()
                            class_id = int(box.cls[0].cpu().numpy())
                            class_name = model.names[class_id]
                            
                            if confidence > 0.5:  # Confidence threshold
                                # Count objects
                                object_counts[class_name] = object_counts.get(class_name, 0) + 1
                                
                                # Draw bounding box
                                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                                cv2.putText(frame, f"{class_name}: {confidence:.2f}", 
                                          (int(x1), int(y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                                
                                # Store detection
                                detections_data.append({
                                    'camera_id': camera_id,
                                    'class': class_name,
                                    'confidence': float(confidence),
                                    'bbox': [int(x1), int(y1), int(x2-x1), int(y2-y1)]
                                })
                
                # Broadcast detection results and save analytics even when no objects detected
                detection_timestamp = datetime.now().isoformat()
                
                if object_counts or True:  # Always process and save analytics
                    await manager.broadcast(json.dumps({
                        'type': 'detection',
                        'camera_id': camera_id,
                        'detections': detections_data,
                        'object_counts': object_counts,
                        'timestamp': detection_timestamp
                    }))
                    
                    # Save analytics to database
                    try:
                        if db:
                            # Get camera user_id for analytics
                            camera_doc = await db.collection('cameras').document(camera_id).get()
                            user_id = None
                            if camera_doc.exists:
                                user_id = camera_doc.to_dict().get('user_id')
                            
                            # Save regular analytics with user_id
                            analytics_data = {
                                'camera_id': camera_id,
                                'user_id': user_id,  # Add user_id for isolation
                                'object_counts': object_counts,
                                'timestamp': datetime.now().isoformat()
                            }
                            await db.collection('analytics').add(analytics_data)
                            print(f"Saved analytics for camera {camera_id}: {object_counts}")
                            
                            # Update hourly analytics with proper aggregation
                            hour_key = datetime.now().strftime('%Y-%m-%d %H:00')
                            total_count = sum(object_counts.values())
                            
                            # Check if hourly record exists
                            hourly_ref = db.collection('hourly_analytics')
                            query = hourly_ref.where('camera_id', '==', camera_id).where('hour_key', '==', hour_key)
                            existing_docs = [doc async for doc in query.stream()]
                            
                            if existing_docs:
                                # Update existing hourly record
                                existing_doc = existing_docs[0]
                                existing_data = existing_doc.to_dict()
                                existing_counts = existing_data.get('object_counts', {})
                                existing_total = existing_data.get('total_detections', 0)
                                
                                # Merge object counts
                                for obj_type, count in object_counts.items():
                                    existing_counts[obj_type] = existing_counts.get(obj_type, 0) + count
                                
                                new_total = existing_total + total_count
                                
                                await existing_doc.reference.update({
                                    'object_counts': existing_counts,
                                    'total_detections': new_total
                                })
                                
                                print(f"Updated hourly analytics for camera {camera_id}, hour {hour_key}: {existing_counts}, total: {new_total}")
                            else:
                                # Insert new hourly record with user_id
                                hourly_data = {
                                    'camera_id': camera_id,
                                    'user_id': user_id,  # Add user_id for isolation
                                    'hour_key': hour_key,
                                    'object_counts': object_counts,
                                    'total_detections': total_count,
                                    'created_at': datetime.now().isoformat()
                                }
                                
                                await db.collection('hourly_analytics').add(hourly_data)
                                print(f"Created new hourly analytics for camera {camera_id}, hour {hour_key}: {object_counts}, total: {total_count}")
                        
                    except Exception as db_error:
                        print(f"Error saving analytics for camera {camera_id}: {db_error}")
                        print(f"Object counts that failed to save: {object_counts}")
                        import traceback
                        traceback.print_exc()
            
            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Broadcast frame
            await manager.broadcast(json.dumps({
                'type': 'frame',
                'camera_id': camera_id,
                'frame': frame_base64,
                'timestamp': datetime.now().isoformat()
            }))
            
            await asyncio.sleep(0.1)  # ~10 FPS
            
    except Exception as e:
        print(f"Error processing camera {camera_id}: {e}")
    finally:
        if 'cap' in locals():
            cap.release()

# API Routes
@app.get("/")
async def root():
    return {"message": "YOLO Object Detection API"}

@app.get("/cameras", response_model=List[CameraResponse])
async def get_cameras(current_user: dict = Depends(get_current_user)):
    """Get all cameras"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        cameras_ref = db.collection('cameras')
        # Filter cameras by current user
        cameras_query = cameras_ref.where('user_id', '==', current_user.get('uid'))
        cameras = cameras_query.stream()
        
        camera_list = []
        async for camera in cameras:
            camera_data = camera.to_dict()
            camera_list.append(
                CameraResponse(
                    id=camera.id,
                    name=camera_data.get('name', ''),
                    ip_address=camera_data.get('ip_address', ''),
                    port=camera_data.get('port', 8080),
                    is_active=camera_data.get('is_active', True),
                    created_at=camera_data.get('created_at', '')
                )
            )
        return camera_list
    except Exception as e:
        print(f"Error fetching cameras: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cameras")

@app.post("/cameras", response_model=CameraResponse)
async def add_camera(camera: Camera, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Add a new camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        camera_data = {
            'name': camera.name,
            'ip_address': camera.ip_address,
            'port': camera.port,
            'is_active': True,
            'created_at': datetime.now().isoformat(),
            'user_id': current_user.get('uid')  # Add user ID for isolation
        }
        
        # Add camera to Firestore
        doc_ref = await db.collection('cameras').add(camera_data)
        camera_id = doc_ref[1].id
        
        # Test camera connection in the background
        background_tasks.add_task(test_camera_connection, camera.ip_address, camera.port)
        
        return CameraResponse(
            id=camera_id,
            name=camera.name,
            ip_address=camera.ip_address,
            port=camera.port,
            is_active=True,
            created_at=datetime.now().isoformat()
        )
    except Exception as e:
        print(f"Error adding camera: {e}")
        raise HTTPException(status_code=500, detail="Failed to add camera")

def test_camera_connection(ip_address: str, port: int):
    """Test camera connection (background task)"""
    try:
        test_url = get_camera_stream_url(ip_address, port)
        response = requests.get(test_url, timeout=5)
        if response.status_code == 200:
            print(f"Camera at {test_url} is reachable")
        else:
            print(f"Camera at {test_url} returned status code {response.status_code}")
    except Exception as e:
        print(f"Error testing camera connection: {e}")

@app.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Verify camera belongs to current user
        camera_doc = await db.collection('cameras').document(camera_id).get()
        if not camera_doc.exists:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        camera_data = camera_doc.to_dict()
        if camera_data.get('user_id') != current_user.get('uid'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Stop camera if active
        if camera_id in active_cameras:
            active_cameras[camera_id] = False
            del active_cameras[camera_id]
        
        # Delete from Firestore
        await db.collection('cameras').document(camera_id).delete()
        
        return {"message": "Camera deleted successfully"}
    except Exception as e:
        print(f"Error deleting camera: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete camera")

@app.post("/cameras/{camera_id}/start")
async def start_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Start camera streaming"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Get camera data from Firestore and verify ownership
        camera_doc = await db.collection('cameras').document(camera_id).get()
        
        if not camera_doc.exists:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        camera_data = camera_doc.to_dict()
        if camera_data.get('user_id') != current_user.get('uid'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if camera_id not in active_cameras:
            active_cameras[camera_id] = True
            # Start camera processing in background
            asyncio.create_task(process_camera_frame(camera_id, camera_data['ip_address'], camera_data['port']))
        
        return {"message": "Camera started"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error starting camera: {e}")
        raise HTTPException(status_code=500, detail="Failed to start camera")

@app.post("/cameras/{camera_id}/stop")
async def stop_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Stop camera streaming"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Verify camera ownership
        camera_doc = await db.collection('cameras').document(camera_id).get()
        if camera_doc.exists:
            camera_data = camera_doc.to_dict()
            if camera_data.get('user_id') != current_user.get('uid'):
                raise HTTPException(status_code=403, detail="Access denied")
    except HTTPException:
        raise
    except Exception:
        pass  # Continue if camera doc doesn't exist
    
    if camera_id in active_cameras:
        active_cameras[camera_id] = False
        del active_cameras[camera_id]
    
    return {"message": "Camera stopped"}

@app.post("/cameras/{camera_id}/detection/{enabled}")
async def toggle_detection(camera_id: str, enabled: bool, current_user: dict = Depends(get_current_user)):
    """Toggle object detection for camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Verify camera ownership
        camera_doc = await db.collection('cameras').document(camera_id).get()
        if camera_doc.exists:
            camera_data = camera_doc.to_dict()
            if camera_data.get('user_id') != current_user.get('uid'):
                raise HTTPException(status_code=403, detail="Access denied")
    except HTTPException:
        raise
    except Exception:
        pass  # Continue if camera doc doesn't exist
    
    detection_enabled[camera_id] = enabled
    
    return {"message": f"Detection {'enabled' if enabled else 'disabled'} for camera {camera_id}"}

@app.get("/analytics/{camera_id}")
async def get_analytics(camera_id: str, hours: int = 24, current_user: dict = Depends(get_current_user)):
    """Get analytics for a camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Verify camera ownership
        camera_doc = await db.collection('cameras').document(camera_id).get()
        if camera_doc.exists:
            camera_data = camera_doc.to_dict()
            if camera_data.get('user_id') != current_user.get('uid'):
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        print(f"Fetching analytics for camera {camera_id} for last {hours} hours")
        
        # Calculate cutoff time
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Query analytics from Firestore - filter by user_id for isolation
        analytics_ref = db.collection('analytics')
        query = analytics_ref.where('camera_id', '==', camera_id).where('user_id', '==', current_user.get('uid')).limit(1000)
        
        analytics_docs = query.stream()
        
        result = []
        async for doc in analytics_docs:
            data = doc.to_dict()
            
            # Filter by time in application code to avoid index requirement
            try:
                record_timestamp = datetime.fromisoformat(data.get('timestamp', ''))
                if record_timestamp >= cutoff_time:
                    result.append({
                        'object_counts': data.get('object_counts', {}),
                        'timestamp': data.get('timestamp', '')
                    })
            except (ValueError, TypeError):
                # Skip records with invalid timestamps
                continue
        
        print(f"Returning {len(result)} analytics records for camera {camera_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching analytics for camera {camera_id}: {e}")
        # Fallback: try simple query without ordering if the above fails
        try:
            print("Attempting fallback query without ordering...")
            analytics_ref = db.collection('analytics')
            simple_query = analytics_ref.where('camera_id', '==', camera_id).where('user_id', '==', current_user.get('uid')).limit(500)
            simple_docs = simple_query.stream()
            
            result = []
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            async for doc in simple_docs:
                data = doc.to_dict()
                try:
                    record_timestamp = datetime.fromisoformat(data.get('timestamp', ''))
                    if record_timestamp >= cutoff_time:
                        result.append({
                            'object_counts': data.get('object_counts', {}),
                            'timestamp': data.get('timestamp', '')
                        })
                except (ValueError, TypeError):
                    continue
            
            print(f"Fallback query returned {len(result)} analytics records")
            return result
            
        except Exception as fallback_error:
            print(f"Fallback query also failed: {fallback_error}")
            return []

@app.get("/analytics/{camera_id}/hourly")
async def get_hourly_analytics(camera_id: str, hours: int = 24, current_user: dict = Depends(get_current_user)):
    """Get hourly analytics aggregation for a camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Verify camera ownership
        camera_doc = await db.collection('cameras').document(camera_id).get()
        if camera_doc.exists:
            camera_data = camera_doc.to_dict()
            if camera_data.get('user_id') != current_user.get('uid'):
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        print(f"Fetching hourly analytics for camera {camera_id} for last {hours} hours")
        
        # Calculate cutoff time
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Query hourly analytics from Firestore - filter by user_id for isolation
        hourly_ref = db.collection('hourly_analytics')
        query = hourly_ref.where('camera_id', '==', camera_id).where('user_id', '==', current_user.get('uid')).limit(200)
        
        hourly_docs = query.stream()
        
        result = []
        async for doc in hourly_docs:
            data = doc.to_dict()
            
            # Filter by time in application code to avoid index requirement
            try:
                record_timestamp = datetime.fromisoformat(data.get('created_at', ''))
                if record_timestamp >= cutoff_time:
                    result.append({
                        'hour': data.get('hour_key', ''),
                        'object_counts': data.get('object_counts', {}),
                        'total': data.get('total_detections', 0)
                    })
            except (ValueError, TypeError):
                # Skip records with invalid timestamps
                continue
        
        print(f"Returning {len(result)} hourly analytics records for camera {camera_id}")
        return result
        
    except Exception as e:
        print(f"Error fetching hourly analytics for camera {camera_id}: {e}")
        # Fallback: try simple query without time filtering
        try:
            print("Attempting fallback hourly query...")
            hourly_ref = db.collection('hourly_analytics')
            simple_query = hourly_ref.where('camera_id', '==', camera_id).limit(100)
            simple_docs = simple_query.stream()
            
            result = []
            async for doc in simple_docs:
                data = doc.to_dict()
                result.append({
                    'hour': data.get('hour_key', ''),
                    'object_counts': data.get('object_counts', {}),
                    'total': data.get('total_detections', 0)
                })
            
            print(f"Fallback hourly query returned {len(result)} records")
            return result
            
        except Exception as fallback_error:
            print(f"Fallback hourly query also failed: {fallback_error}")
            return []

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get('type') == 'ping':
                await websocket.send_text(json.dumps({'type': 'pong'}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/debug/database/{camera_id}")
async def debug_database(camera_id: str):
    """Debug endpoint to inspect database contents"""
    if not db:
        return {'error': 'Database not initialized'}
    
    try:
        # Count analytics records
        analytics_ref = db.collection('analytics')
        analytics_query = analytics_ref.where('camera_id', '==', camera_id)
        analytics_docs = [doc async for doc in analytics_query.stream()]
        analytics_count = len(analytics_docs)
        
        # Count hourly analytics records
        hourly_ref = db.collection('hourly_analytics')
        hourly_query = hourly_ref.where('camera_id', '==', camera_id)
        hourly_docs = [doc async for doc in hourly_query.stream()]
        hourly_count = len(hourly_docs)
        
        # Get recent records
        recent_analytics = analytics_docs[:5] if analytics_docs else []
        recent_hourly = hourly_docs[:5] if hourly_docs else []
        
        return {
            'camera_id': camera_id,
            'analytics_records_count': analytics_count,
            'hourly_records_count': hourly_count,
            'recent_analytics': [doc.to_dict() for doc in recent_analytics],
            'recent_hourly': [doc.to_dict() for doc in recent_hourly]
        }
    except Exception as e:
        print(f"Error in debug endpoint: {e}")
        return {'error': str(e)}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Chat with LLM assistant about camera analytics"""

    # Check if services are available
    if not gemini_client:
        return ChatResponse(
            response="I'm sorry, but the AI assistant is not currently available because the Google API key is not configured. Please set the GOOGLE_API_KEY environment variable with your Gemini API key. You can get one from https://makersuite.google.com/app/apikey",
            timestamp=datetime.now().isoformat()
        )

    if not db:
        return ChatResponse(
            response="I'm sorry, but I cannot access the analytics database right now. Please check your Firestore configuration.",
            timestamp=datetime.now().isoformat()
        )

    try:
        print(f"Processing chat message: {message.message[:50]}...")

        # Get analytics data for context
        context_data = "No analytics data available yet."

        try:
            if message.camera_id:
                # Get specific camera analytics with error handling
                print(f"Fetching analytics for camera: {message.camera_id}")
                analytics_ref = db.collection('analytics')
                query = analytics_ref.where('camera_id', '==', message.camera_id).limit(10)
                analytics_docs = query.stream()

                camera_analytics = []
                async for doc in analytics_docs:
                    camera_analytics.append(doc.to_dict())

                if camera_analytics:
                    # Create structured context data
                    total_detections = sum(
                        sum(record.get('object_counts', {}).values()) 
                        for record in camera_analytics
                    )
                    
                    # Aggregate object counts
                    aggregated_objects = {}
                    for record in camera_analytics:
                        for obj_type, count in record.get('object_counts', {}).items():
                            aggregated_objects[obj_type] = aggregated_objects.get(obj_type, 0) + count
                    
                    # Sort objects by count
                    sorted_objects = sorted(aggregated_objects.items(), key=lambda x: x[1], reverse=True)
                    
                    context_data = f"""Camera {message.camera_id} Analytics:
• Detection Records: {len(camera_analytics)} recent entries
• Total Objects Detected: {total_detections}
• Object Types Found: {', '.join([f"{obj}: {count}" for obj, count in sorted_objects[:5]])}
• Most Common Object: {sorted_objects[0][0] if sorted_objects else 'None'} ({sorted_objects[0][1] if sorted_objects else 0} detections)
• Detection Activity: {'High' if total_detections > 20 else 'Moderate' if total_detections > 5 else 'Low'}"""
                else:
                    context_data = f"""Camera {message.camera_id} Status:
• Detection Records: 0 (No data yet)
• Status: Camera may not be active or detection not enabled
• Recommendation: Start camera streaming and enable object detection"""
            else:
                # Get general analytics summary
                print("Fetching general analytics summary")
                analytics_ref = db.collection('analytics')
                query = analytics_ref.limit(20)
                analytics_docs = query.stream()

                general_analytics = []
                async for doc in analytics_docs:
                    general_analytics.append(doc.to_dict())

                if general_analytics:
                    # Create structured system-wide context
                    total_detections = sum(
                        sum(record.get('object_counts', {}).values()) 
                        for record in general_analytics
                    )
                    camera_ids = set(record.get('camera_id') for record in general_analytics if record.get('camera_id'))
                    
                    # Aggregate all object types across cameras
                    all_objects = {}
                    for record in general_analytics:
                        for obj_type, count in record.get('object_counts', {}).items():
                            all_objects[obj_type] = all_objects.get(obj_type, 0) + count
                    
                    sorted_all_objects = sorted(all_objects.items(), key=lambda x: x[1], reverse=True)
                    
                    context_data = f"""System-Wide Analytics Summary:
• Active Cameras: {len(camera_ids)} cameras
• Detection Records: {len(general_analytics)} recent entries  
• Total Objects Detected: {total_detections}
• Top Object Types: {', '.join([f"{obj}: {count}" for obj, count in sorted_all_objects[:3]])}
• System Activity: {'Very High' if total_detections > 50 else 'High' if total_detections > 20 else 'Moderate'}"""
                else:
                    context_data = """System Status:
• Detection Records: 0 (No data available)
• Active Cameras: None currently detecting
• Status: System appears to be inactive
• Next Steps: Add cameras and start detection to begin analytics"""

        except Exception as context_error:
            print(f"Error fetching context data: {context_error}")
            context_data = """System Status:
• Analytics Data: ⚠️ Temporarily unavailable
• Issue: Database connection error
• Action: Please try again in a moment"""

        # Create prompt with context for beautiful formatted responses
        prompt = f"""You are an AI assistant for a YOLO object detection system. Help users analyze their camera analytics data.

Context information:
{context_data}

User question: {message.message}

IMPORTANT FORMATTING GUIDELINES:
- Use clear structure with bullet points (•) and numbered lists
- Include relevant emojis for visual appeal
- Use line breaks for better readability
- Highlight key numbers and insights with **bold** formatting
- Use sections like "📊 Summary:", "🔍 Details:", "💡 Insights:" when appropriate
- Keep responses under 200 words but well-organized
- Use markdown-style formatting that will display nicely in chat

Example format:
📊 **Detection Summary:**
• Total objects detected: **24**
• Most common: **chair** (8 detections)
• Activity level: **High**

🎯 **Key Insights:**
• Peak detection time: Morning hours
• Detection accuracy: 95%

💡 **Recommendations:**
• Consider adjusting sensitivity for better results

Provide a helpful, beautifully formatted response based on the available analytics data."""

        print("Generating AI response...")
        # Generate response using Gemini with error handling
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash", contents=prompt
            )
            ai_response = response.text if response.text else "I'm sorry, I couldn't generate a response. Please try again."
        except Exception as ai_error:
            print(f"Error generating AI response: {ai_error}")
            ai_response = f"I'm sorry, I encountered an error while processing your question: '{message.message}'. The AI service might be temporarily unavailable. Please try again later."

        # Save chat history with error handling
        try:
            chat_record = {
                'user_message': message.message,
                'ai_response': ai_response,
                'camera_id': message.camera_id,
                'user_id': current_user.get('uid'),  # Add user_id for isolation
                'timestamp': datetime.now().isoformat()
            }

            await db.collection('chat_history').add(chat_record)
            print("Chat history saved successfully")
        except Exception as save_error:
            print(f"Error saving chat history: {save_error}")
            # Don't fail the request if saving history fails

        return ChatResponse(
            response=ai_response,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        print(f"Error in chat assistant: {e}")
        import traceback
        traceback.print_exc()

        # Return a friendly error message instead of HTTP exception
        return ChatResponse(
            response=f"I'm sorry, I encountered an unexpected error while processing your message. Please try again. Error: {str(e)}",
            timestamp=datetime.now().isoformat()
        )


@app.get("/chat/history/{camera_id}")
async def get_chat_history(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve chat history for a specific camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Verify camera ownership
        camera_doc = await db.collection('cameras').document(camera_id).get()
        if camera_doc.exists:
            camera_data = camera_doc.to_dict()
            if camera_data.get('user_id') != current_user.get('uid'):
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        print(f"Fetching chat history for camera: {camera_id}")
        
        # Query Firestore for chat history filtered by user
        chat_ref = db.collection('chat_history')
        query = chat_ref.where('camera_id', '==', camera_id).where('user_id', '==', current_user.get('uid')).limit(50)
        chat_docs = query.stream()
        
        chat_history = []
        async for doc in chat_docs:
            chat_history.append(doc.to_dict())
        
        # Sort by timestamp descending in application code
        chat_history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        print(f"Retrieved {len(chat_history)} chat history records for camera {camera_id}")
        return chat_history
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching chat history for camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")
    
@app.delete("/chat/history/{camera_id}")
async def clear_chat_history(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Clear chat history for a specific camera"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        print(f"Clearing chat history for camera: {camera_id}")
        
        # Query Firestore for chat history
        chat_ref = db.collection('chat_history')
        query = chat_ref.where('camera_id', '==', camera_id)
        chat_docs = query.stream()
        
        # Delete each document
        async for doc in chat_docs:
            await doc.reference.delete()
        
        print(f"Chat history cleared for camera {camera_id}")
        return {"message": f"Chat history cleared for camera {camera_id}"}
    except Exception as e:
        print(f"Error clearing chat history for camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat history")    

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_cameras": len(active_cameras),
        "model_loaded": model is not None,
        "firestore_connected": db is not None,
        "gemini_ai_connected": gemini_client is not None,
        "services": {
            "yolo_model": "✅" if model else "❌",
            "firestore": "✅" if db else "❌", 
            "gemini_ai": "✅" if gemini_client else "❌"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)