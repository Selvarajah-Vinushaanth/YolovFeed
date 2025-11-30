import asyncio
import json
import base64
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from datetime import datetime
import sqlite3
from typing import Dict, List
import threading
from services import ObjectDetector, CameraManager, AnalyticsManager
from main import *

# Enhanced WebSocket manager for better real-time communication
class EnhancedConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.camera_subscribers: Dict[int, List[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        # Remove from camera subscriptions
        for camera_id in list(self.camera_subscribers.keys()):
            if client_id in self.camera_subscribers[camera_id]:
                self.camera_subscribers[camera_id].remove(client_id)
                if not self.camera_subscribers[camera_id]:
                    del self.camera_subscribers[camera_id]
        
        print(f"Client {client_id} disconnected")

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                print(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: str):
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def broadcast_to_camera_subscribers(self, camera_id: int, message: str):
        if camera_id not in self.camera_subscribers:
            return
        
        disconnected_clients = []
        for client_id in self.camera_subscribers[camera_id]:
            try:
                await self.send_personal_message(message, client_id)
            except Exception as e:
                print(f"Error sending camera message to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    def subscribe_to_camera(self, client_id: str, camera_id: int):
        if camera_id not in self.camera_subscribers:
            self.camera_subscribers[camera_id] = []
        if client_id not in self.camera_subscribers[camera_id]:
            self.camera_subscribers[camera_id].append(client_id)

    def unsubscribe_from_camera(self, client_id: str, camera_id: int):
        if camera_id in self.camera_subscribers and client_id in self.camera_subscribers[camera_id]:
            self.camera_subscribers[camera_id].remove(client_id)
            if not self.camera_subscribers[camera_id]:
                del self.camera_subscribers[camera_id]

# Global enhanced manager
enhanced_manager = EnhancedConnectionManager()

# Enhanced camera processing with better performance
async def enhanced_process_camera_frame(camera_id: int, ip_address: str, port: int):
    """Enhanced camera processing with optimized performance"""
    camera_manager = CameraManager()
    detector = ObjectDetector()
    analytics = AnalyticsManager()
    
    stream_url = camera_manager.get_ip_webcam_urls(ip_address, port)['video']
    
    try:
        cap = cv2.VideoCapture(stream_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FPS, 15)  # Increase FPS
        
        frame_skip = 0
        detection_interval = 3  # Run detection every 3rd frame for performance
        
        while camera_id in active_cameras and active_cameras[camera_id]:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.1)
                continue
            
            # Optimize frame size
            frame = cv2.resize(frame, (640, 480))
            
            # Skip frames for performance
            frame_skip += 1
            run_detection = detection_enabled.get(camera_id, False) and (frame_skip % detection_interval == 0)
            
            annotated_frame = frame.copy()
            object_counts = {}
            detections_data = []
            
            # Run detection if enabled
            if run_detection and detector.loaded:
                detection_result = detector.detect_objects(frame, confidence_threshold=0.6)
                annotated_frame = detection_result['annotated_frame']
                object_counts = detection_result['object_counts']
                
                # Convert detections format
                for detection in detection_result['detections']:
                    detections_data.append({
                        'camera_id': camera_id,
                        'class': detection['class_name'],
                        'confidence': detection['confidence'],
                        'bbox': [
                            detection['bbox']['x1'],
                            detection['bbox']['y1'],
                            detection['bbox']['width'],
                            detection['bbox']['height']
                        ]
                    })
                
                # Save analytics
                if object_counts:
                    analytics.process_detection_data(camera_id, object_counts)
                    save_analytics(camera_id, object_counts)
                
                # Broadcast detection results
                await enhanced_manager.broadcast(json.dumps({
                    'type': 'detection',
                    'camera_id': camera_id,
                    'detections': detections_data,
                    'object_counts': object_counts,
                    'timestamp': datetime.now().isoformat()
                }))
            
            # Encode and broadcast frame
            encode_quality = 85 if run_detection else 90  # Better quality when not detecting
            _, buffer = cv2.imencode('.jpg', annotated_frame, 
                                   [cv2.IMWRITE_JPEG_QUALITY, encode_quality])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Broadcast frame to subscribers
            await enhanced_manager.broadcast_to_camera_subscribers(camera_id, json.dumps({
                'type': 'frame',
                'camera_id': camera_id,
                'frame': frame_base64,
                'timestamp': datetime.now().isoformat()
            }))
            
            # Adaptive sleep based on detection status
            await asyncio.sleep(0.033 if run_detection else 0.066)  # ~30 FPS detecting, ~15 FPS idle
            
    except Exception as e:
        print(f"Error in enhanced camera processing {camera_id}: {e}")
        
        # Send error message
        await enhanced_manager.broadcast(json.dumps({
            'type': 'error',
            'camera_id': camera_id,
            'message': f"Camera error: {str(e)}",
            'timestamp': datetime.now().isoformat()
        }))
    finally:
        if 'cap' in locals():
            cap.release()

# Enhanced WebSocket endpoint
@app.websocket("/ws/{client_id}")
async def enhanced_websocket_endpoint(websocket: WebSocket, client_id: str):
    """Enhanced WebSocket endpoint with client management"""
    await enhanced_manager.connect(websocket, client_id)
    
    try:
        # Send initial connection confirmation
        await enhanced_manager.send_personal_message(json.dumps({
            'type': 'connected',
            'client_id': client_id,
            'timestamp': datetime.now().isoformat()
        }), client_id)
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get('type') == 'ping':
                    await enhanced_manager.send_personal_message(json.dumps({
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    }), client_id)
                
                elif message.get('type') == 'subscribe_camera':
                    camera_id = message.get('camera_id')
                    if camera_id:
                        enhanced_manager.subscribe_to_camera(client_id, camera_id)
                        await enhanced_manager.send_personal_message(json.dumps({
                            'type': 'subscribed',
                            'camera_id': camera_id,
                            'timestamp': datetime.now().isoformat()
                        }), client_id)
                
                elif message.get('type') == 'unsubscribe_camera':
                    camera_id = message.get('camera_id')
                    if camera_id:
                        enhanced_manager.unsubscribe_from_camera(client_id, camera_id)
                        await enhanced_manager.send_personal_message(json.dumps({
                            'type': 'unsubscribed',
                            'camera_id': camera_id,
                            'timestamp': datetime.now().isoformat()
                        }), client_id)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error handling message from {client_id}: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        enhanced_manager.disconnect(client_id)

# Override the original camera processing function
async def process_camera_frame(camera_id: int, ip_address: str, port: int):
    """Use enhanced processing"""
    await enhanced_process_camera_frame(camera_id, ip_address, port)

# Update camera start function to use enhanced processing
@app.post("/cameras/{camera_id}/start")
async def enhanced_start_camera(camera_id: int):
    """Enhanced camera start with better error handling"""
    conn = sqlite3.connect('cameras.db')
    cursor = conn.cursor()
    cursor.execute('SELECT ip_address, port FROM cameras WHERE id = ?', (camera_id,))
    camera_data = cursor.fetchone()
    conn.close()
    
    if not camera_data:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if camera_id not in active_cameras:
        # Test camera connection first
        camera_manager = CameraManager()
        if not camera_manager.test_camera_connection(camera_data[0], camera_data[1]):
            raise HTTPException(status_code=400, detail="Cannot connect to camera")
        
        active_cameras[camera_id] = True
        
        # Start enhanced camera processing in background
        asyncio.create_task(enhanced_process_camera_frame(camera_id, camera_data[0], camera_data[1]))
        
        # Broadcast status update
        await enhanced_manager.broadcast(json.dumps({
            'type': 'camera_status',
            'camera_id': camera_id,
            'status': 'started',
            'timestamp': datetime.now().isoformat()
        }))
    
    return {"message": "Camera started"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)