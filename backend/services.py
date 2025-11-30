import cv2
import numpy as np
from ultralytics import YOLO
from typing import Dict, List, Tuple, Optional
import json
import asyncio
from datetime import datetime

class ObjectDetector:
    def __init__(self, model_name: str = 'yolov8n.pt'):
        """Initialize YOLO object detector"""
        try:
            self.model = YOLO(model_name)
            self.loaded = True
            print(f"YOLO model {model_name} loaded successfully")
        except Exception as e:
            print(f"Error loading YOLO model: {e}")
            self.loaded = False
            self.model = None
    
    def detect_objects(self, frame: np.ndarray, confidence_threshold: float = 0.5) -> Dict:
        """
        Detect objects in frame
        
        Args:
            frame: Input image frame
            confidence_threshold: Minimum confidence for detections
            
        Returns:
            Dictionary containing detections and annotated frame
        """
        if not self.loaded:
            return {
                'detections': [],
                'object_counts': {},
                'annotated_frame': frame
            }
        
        try:
            # Run inference
            results = self.model(frame)
            
            detections = []
            object_counts = {}
            annotated_frame = frame.copy()
            
            # Process results
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Extract detection data
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = self.model.names[class_id]
                        
                        if confidence >= confidence_threshold:
                            # Create detection record
                            detection = {
                                'class_name': class_name,
                                'confidence': confidence,
                                'bbox': {
                                    'x1': int(x1),
                                    'y1': int(y1),
                                    'x2': int(x2),
                                    'y2': int(y2),
                                    'width': int(x2 - x1),
                                    'height': int(y2 - y1)
                                }
                            }
                            detections.append(detection)
                            
                            # Count objects
                            object_counts[class_name] = object_counts.get(class_name, 0) + 1
                            
                            # Draw bounding box
                            color = self._get_class_color(class_id)
                            cv2.rectangle(annotated_frame, 
                                        (int(x1), int(y1)), 
                                        (int(x2), int(y2)), 
                                        color, 2)
                            
                            # Draw label
                            label = f"{class_name}: {confidence:.2f}"
                            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                            
                            # Background rectangle for label
                            cv2.rectangle(annotated_frame,
                                        (int(x1), int(y1) - label_size[1] - 10),
                                        (int(x1) + label_size[0], int(y1)),
                                        color, -1)
                            
                            # Label text
                            cv2.putText(annotated_frame, label,
                                      (int(x1), int(y1) - 5),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            return {
                'detections': detections,
                'object_counts': object_counts,
                'annotated_frame': annotated_frame
            }
            
        except Exception as e:
            print(f"Error during object detection: {e}")
            return {
                'detections': [],
                'object_counts': {},
                'annotated_frame': frame
            }
    
    def _get_class_color(self, class_id: int) -> Tuple[int, int, int]:
        """Get consistent color for each object class"""
        colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
            (128, 0, 128),  # Purple
            (255, 165, 0),  # Orange
            (255, 192, 203), # Pink
            (0, 128, 0),    # Dark Green
        ]
        return colors[class_id % len(colors)]

class CameraManager:
    def __init__(self):
        self.active_streams = {}
        self.detector = ObjectDetector()
    
    def get_ip_webcam_urls(self, ip_address: str, port: int = 8080) -> Dict[str, str]:
        """Generate IP Webcam URLs for different stream types"""
        base_url = f"http://{ip_address}:{port}"
        return {
            'video': f"{base_url}/video",
            'photo': f"{base_url}/photo.jpg",
            'status': f"{base_url}/status.json",
            'focus': f"{base_url}/focus",
            'settings': f"{base_url}/settings"
        }
    
    def test_camera_connection(self, ip_address: str, port: int = 8080) -> bool:
        """Test if camera is accessible"""
        try:
            import requests
            urls = self.get_ip_webcam_urls(ip_address, port)
            response = requests.get(urls['status'], timeout=5)
            return response.status_code == 200
        except Exception as e:
            print(f"Camera connection test failed: {e}")
            return False
    
    def create_camera_stream(self, ip_address: str, port: int = 8080) -> Optional[cv2.VideoCapture]:
        """Create OpenCV VideoCapture for IP camera"""
        try:
            urls = self.get_ip_webcam_urls(ip_address, port)
            cap = cv2.VideoCapture(urls['video'])
            
            # Configure capture properties
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_FPS, 10)
            
            # Test if we can read a frame
            ret, frame = cap.read()
            if ret:
                return cap
            else:
                cap.release()
                return None
                
        except Exception as e:
            print(f"Error creating camera stream: {e}")
            return None

class AnalyticsManager:
    def __init__(self, firestore_client=None):
        self.detection_history = {}
        self.db = firestore_client
    
    def set_firestore_client(self, firestore_client):
        """Set the Firestore client after initialization"""
        self.db = firestore_client
    
    async def save_detection_to_firestore(self, camera_id: str, object_counts: Dict[str, int]):
        """Save detection data directly to Firestore"""
        if not self.db:
            print("Firestore client not available")
            return
        
        try:
            detection_data = {
                'camera_id': camera_id,
                'object_counts': object_counts,
                'timestamp': datetime.now().isoformat()
            }
            
            await self.db.collection('detections').add(detection_data)
            print(f"Saved detection data to Firestore for camera {camera_id}")
        except Exception as e:
            print(f"Error saving detection to Firestore: {e}")
    
    async def get_analytics_from_firestore(self, camera_id: str, hours: int = 24) -> List[Dict]:
        """Get analytics data from Firestore"""
        if not self.db:
            return []
        
        try:
            from datetime import timedelta
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            analytics_ref = self.db.collection('analytics')
            query = analytics_ref.where('camera_id', '==', camera_id).where('timestamp', '>=', cutoff_time.isoformat())
            
            docs = query.stream()
            result = []
            async for doc in docs:
                result.append(doc.to_dict())
            
            return result
        except Exception as e:
            print(f"Error fetching analytics from Firestore: {e}")
            return []
    
    def process_detection_data(self, camera_id: str, object_counts: Dict[str, int]) -> Dict:
        """Process and aggregate detection data"""
        timestamp = datetime.now()
        
        # Store detection data in memory for immediate processing
        if camera_id not in self.detection_history:
            self.detection_history[camera_id] = []
        
        self.detection_history[camera_id].append({
            'timestamp': timestamp,
            'object_counts': object_counts.copy()
        })
        
        # Keep only last 2000 detections per camera for memory efficiency
        if len(self.detection_history[camera_id]) > 2000:
            self.detection_history[camera_id] = self.detection_history[camera_id][-2000:]
        
        # Also save to Firestore if available (async)
        if self.db:
            asyncio.create_task(self.save_detection_to_firestore(camera_id, object_counts))
        
        return self._generate_analytics_summary(camera_id)
    
    def _generate_analytics_summary(self, camera_id: str) -> Dict:
        """Generate analytics summary for camera"""
        if camera_id not in self.detection_history:
            return {
                'total_objects': 0,
                'object_types': {},
                'recent_activity': [],
                'hourly_distribution': {}
            }
        
        history = self.detection_history[camera_id]
        if not history:
            return {
                'total_objects': 0,
                'object_types': {},
                'recent_activity': [],
                'hourly_distribution': {}
            }
        
        # Calculate totals
        total_objects = 0
        object_types = {}
        hourly_distribution = {}
        
        # Get recent activity (last 20 detections)
        recent_activity = []
        for record in history[-20:]:
            total_in_frame = sum(record['object_counts'].values())
            total_objects += total_in_frame
            
            hour_key = record['timestamp'].strftime('%H:00')
            if hour_key not in hourly_distribution:
                hourly_distribution[hour_key] = {}
            
            for obj_type, count in record['object_counts'].items():
                object_types[obj_type] = object_types.get(obj_type, 0) + count
                hourly_distribution[hour_key][obj_type] = hourly_distribution[hour_key].get(obj_type, 0) + count
            
            recent_activity.append({
                'timestamp': record['timestamp'].isoformat(),
                'object_counts': record['object_counts'],
                'total_in_frame': total_in_frame
            })
        
        return {
            'total_objects': total_objects,
            'object_types': object_types,
            'recent_activity': recent_activity,
            'hourly_distribution': hourly_distribution
        }
    
    def get_hourly_stats(self, camera_id: str, hours: int = 24) -> List[Dict]:
        """Get hourly statistics for camera"""
        if camera_id not in self.detection_history:
            return []
        
        from datetime import timedelta
        now = datetime.now()
        cutoff_time = now - timedelta(hours=hours)
        
        # Filter recent data
        recent_data = [
            record for record in self.detection_history[camera_id]
            if record['timestamp'] > cutoff_time
        ]
        
        # Group by hour
        hourly_stats = {}
        for record in recent_data:
            hour_key = record['timestamp'].strftime('%Y-%m-%d %H:00')
            if hour_key not in hourly_stats:
                hourly_stats[hour_key] = {}
            
            for obj_type, count in record['object_counts'].items():
                hourly_stats[hour_key][obj_type] = hourly_stats[hour_key].get(obj_type, 0) + count
        
        # Convert to list format
        result = []
        for hour, counts in sorted(hourly_stats.items()):
            result.append({
                'hour': hour,
                'object_counts': counts,
                'total': sum(counts.values())
            })
        
        return result
    
    def get_object_type_stats(self, camera_id: str) -> Dict[str, int]:
        """Get total count by object type"""
        if camera_id not in self.detection_history:
            return {}
        
        object_stats = {}
        for record in self.detection_history[camera_id]:
            for obj_type, count in record['object_counts'].items():
                object_stats[obj_type] = object_stats.get(obj_type, 0) + count
        
        return object_stats
    
    def get_peak_detection_time(self, camera_id: str) -> Optional[Dict]:
        """Get time with most detections"""
        if camera_id not in self.detection_history:
            return None
        
        history = self.detection_history[camera_id]
        if not history:
            return None
        
        peak_record = max(
            history,
            key=lambda r: sum(r['object_counts'].values()),
            default=None
        )
        
        if peak_record:
            total = sum(peak_record['object_counts'].values())
            return {
                'timestamp': peak_record['timestamp'].isoformat(),
                'total_objects': total,
                'object_counts': peak_record['object_counts']
            }
        
        return None
    
    def get_average_detections_per_hour(self, camera_id: str, hours: int = 24) -> float:
        """Calculate average detections per hour"""
        if camera_id not in self.detection_history:
            return 0.0
        
        from datetime import timedelta
        now = datetime.now()
        cutoff_time = now - timedelta(hours=hours)
        
        recent_data = [
            record for record in self.detection_history[camera_id]
            if record['timestamp'] > cutoff_time
        ]
        
        if not recent_data or hours == 0:
            return 0.0
        
        total_objects = sum(
            sum(record['object_counts'].values()) for record in recent_data
        )
        
        return total_objects / hours

# Global instances
detector = ObjectDetector()
camera_manager = CameraManager()
analytics_manager = AnalyticsManager()