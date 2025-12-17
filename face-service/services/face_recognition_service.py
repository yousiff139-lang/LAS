"""
Face Recognition Service
Handles face detection, encoding, and verification
"""
import face_recognition
import numpy as np
from typing import List, Dict, Tuple, Optional
import json


class FaceRecognitionService:
    """Service for face detection, encoding, and matching"""
    
    def __init__(self, match_threshold: float = 0.6):
        """
        Initialize face recognition service
        
        Args:
            match_threshold: Distance threshold for face matching (lower = stricter)
        """
        self.match_threshold = match_threshold
    
    def detect_faces(self, image: np.ndarray, model: str = 'hog') -> List[Tuple[int, int, int, int]]:
        """
        Detect all faces in an image
        
        Args:
            image: Image array in RGB format
            model: Detection model ('hog' or 'cnn')
            
        Returns:
            List of face locations [(top, right, bottom, left), ...]
        """
        try:
            locations = face_recognition.face_locations(image, model=model)
            return locations
        except Exception as e:
            print(f"Face detection error: {e}")
            return []
    
    def encode_face(self, image: np.ndarray, face_location: Optional[Tuple] = None) -> Optional[List[float]]:
        """
        Generate 128-dimensional face encoding
        
        Args:
            image: Image array in RGB format
            face_location: Optional pre-detected face location
            
        Returns:
            Face encoding as list of floats, or None if no face found
        """
        try:
            if face_location:
                # Use provided location
                encodings = face_recognition.face_encodings(image, [face_location])
            else:
                # Auto-detect face
                encodings = face_recognition.face_encodings(image)
            
            if encodings:
                # Convert numpy array to list for JSON serialization
                return encodings[0].tolist()
            return None
        except Exception as e:
            print(f"Face encoding error: {e}")
            return None
    
    def compare_faces(self, known_encoding: List[float], unknown_encoding: List[float]) -> Dict:
        """
        Compare two face encodings
        
        Args:
            known_encoding: Reference face encoding
            unknown_encoding: Face encoding to compare
            
        Returns:
            Dictionary with match result and distance
        """
        try:
            # Convert lists back to numpy arrays
            known_np = np.array(known_encoding)
            unknown_np = np.array(unknown_encoding)
            
            # Calculate face distance (Euclidean distance)
            distance = face_recognition.face_distance([known_np], unknown_np)[0]
            
            # Check if match
            is_match = distance <= self.match_threshold
            
            # Calculate confidence (inverse of distance, normalized)
            confidence = max(0, 1 - (distance / 1.0))
            
            return {
                'match': is_match,
                'distance': float(distance),
                'confidence': float(confidence),
                'threshold': self.match_threshold,
                'message': self._get_match_message(is_match, distance)
            }
        except Exception as e:
            return {
                'match': False,
                'distance': 999.0,
                'confidence': 0.0,
                'threshold': self.match_threshold,
                'error': str(e),
                'message': f'Comparison failed: {e}'
            }
    
    def verify_face(self, image: np.ndarray, known_encoding: List[float]) -> Dict:
        """
        Complete verification: detect, encode, and compare
        
        Args:
            image: Image to verify (RGB format)
            known_encoding: Stored face encoding
            
        Returns:
            Verification result with detection and matching info
        """
        # Detect faces
        face_locations = self.detect_faces(image)
        
        if not face_locations:
            return {
                'success': False,
                'match': False,
                'message': 'No face detected in image',
                'faces_detected': 0
            }
        
        if len(face_locations) > 1:
            return {
                'success': False,
                'match': False,
                'message': f'Multiple faces detected ({len(face_locations)}). Please ensure only one face is visible.',
                'faces_detected': len(face_locations)
            }
        
        # Encode the detected face
        unknown_encoding = self.encode_face(image, face_locations[0])
        
        if unknown_encoding is None:
            return {
                'success': False,
                'match': False,
                'message': 'Failed to encode detected face',
                'faces_detected': 1
            }
        
        # Compare encodings
        comparison = self.compare_faces(known_encoding, unknown_encoding)
        
        return {
            'success': True,
            'match': comparison['match'],
            'distance': comparison['distance'],
            'confidence': comparison['confidence'],
            'faces_detected': 1,
            'face_location': face_locations[0],
            'message': comparison['message']
        }
    
    def register_face(self, image: np.ndarray) -> Dict:
        """
        Register a new face: detect and encode
        
        Args:
            image: Image containing face to register (RGB format)
            
        Returns:
            Registration result with encoding
        """
        # Detect faces
        face_locations = self.detect_faces(image)
        
        if not face_locations:
            return {
                'success': False,
                'message': 'No face detected in image',
                'faces_detected': 0,
                'encoding': None
            }
        
        if len(face_locations) > 1:
            return {
                'success': False,
                'message': f'Multiple faces detected ({len(face_locations)}). Please ensure only one face is visible.',
                'faces_detected': len(face_locations),
                'encoding': None
            }
        
        # Encode the face
        encoding = self.encode_face(image, face_locations[0])
        
        if encoding is None:
            return {
                'success': False,
                'message': 'Failed to encode detected face',
                'faces_detected': 1,
                'encoding': None
            }
        
        return {
            'success': True,
            'message': 'Face registered successfully',
            'faces_detected': 1,
            'face_location': face_locations[0],
            'encoding': encoding,
            'encoding_json': json.dumps(encoding)  # For easy database storage
        }
    
    def _get_match_message(self, is_match: bool, distance: float) -> str:
        """
        Generate human-readable match message
        
        Args:
            is_match: Whether faces match
            distance: Face distance
            
        Returns:
            Status message
        """
        if is_match:
            return f'Face match confirmed (distance: {distance:.3f})'
        else:
            return f'Face does not match (distance: {distance:.3f}, threshold: {self.match_threshold})'


# Singleton instance
_face_service = None


def get_face_recognition_service(threshold: float = 0.6) -> FaceRecognitionService:
    """
    Get or create face recognition service instance
    
    Args:
        threshold: Match threshold
        
    Returns:
        FaceRecognitionService instance
    """
    global _face_service
    if _face_service is None:
        _face_service = FaceRecognitionService(threshold)
    return _face_service
