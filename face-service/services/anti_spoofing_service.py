"""
Anti-Spoofing Service
Detects fake faces using ML-based liveness detection
"""
import os
from typing import Dict, Tuple
import numpy as np
import cv2
from deepface import DeepFace


class AntiSpoofingService:
    """Service for detecting spoofed faces (photos, videos, etc.)"""
    
    def __init__(self, threshold: float = 0.8):
        """
        Initialize anti-spoofing service
        
        Args:
            threshold: Confidence threshold for real face detection (0-1)
        """
        self.threshold = threshold
        self._model_loaded = False
    
    def check_liveness(self, image: np.ndarray) -> Dict:
        """
        Check if the face in the image is real or spoofed
        
        Args:
            image: Image array (BGR format from OpenCV)
            
        Returns:
            Dictionary with liveness detection results:
            {
                'is_real': bool,
                'confidence': float,
                'score': float,
                'message': str
            }
        """
        try:
            # Convert BGR to RGB for DeepFace
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Use DeepFace's built-in anti-spoofing
            # DeepFace extract_faces has anti_spoofing parameter
            result = DeepFace.extract_faces(
                img_path=image_rgb,
                detector_backend='opencv',
                enforce_detection=True,
                anti_spoofing=True
            )
            
            if not result or len(result) == 0:
                return {
                    'is_real': False,
                    'confidence': 0.0,
                    'score': 0.0,
                    'message': 'No face detected'
                }
            
            # Get the first face result
            face_data = result[0]
            
            # Check if anti-spoofing passed
            is_real = face_data.get('is_real', False)
            antispoof_score = face_data.get('antispoof_score', 0.0)
            
            # Determine if confidence meets threshold
            passes_threshold = antispoof_score >= self.threshold
            
            return {
                'is_real': is_real and passes_threshold,
                'confidence': antispoof_score,
                'score': antispoof_score,
                'message': self._get_message(is_real, passes_threshold, antispoof_score)
            }
            
        except Exception as e:
            # Fallback to basic analysis if DeepFace fails
            return self._fallback_liveness_check(image, str(e))
    
    def _fallback_liveness_check(self, image: np.ndarray, error: str) -> Dict:
        """
        Fallback method using basic image analysis
        
        Args:
            image: Image array
            error: Error message from main method
            
        Returns:
            Liveness check result
        """
        try:
            # Basic texture analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate Laplacian variance (blur detection)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Higher variance suggests more detail (real face)
            # Lower variance suggests printed/flat image
            score = min(1.0, laplacian_var / 1000.0)
            is_real = score >= self.threshold
            
            return {
                'is_real': is_real,
                'confidence': score,
                'score': score,
                'message': f'Fallback method used. Score: {score:.2f}. Original error: {error}'
            }
        except Exception as fallback_error:
            return {
                'is_real': False,
                'confidence': 0.0,
                'score': 0.0,
                'message': f'Anti-spoofing failed: {fallback_error}'
            }
    
    def _get_message(self, is_real: bool, passes_threshold: bool, score: float) -> str:
        """
        Generate human-readable message
        
        Args:
            is_real: Whether face is detected as real
            passes_threshold: Whether confidence meets threshold
            score: Confidence score
            
        Returns:
            Status message
        """
        if is_real and passes_threshold:
            return f'Live face detected (confidence: {score:.2f})'
        elif is_real and not passes_threshold:
            return f'Face detected but confidence too low ({score:.2f} < {self.threshold})'
        else:
            return f'Spoofed face detected (score: {score:.2f})'
    
    def analyze_multiple_frames(self, frames: list) -> Dict:
        """
        Analyze multiple frames for improved accuracy
        
        Args:
            frames: List of image arrays
            
        Returns:
            Aggregated liveness result
        """
        if not frames:
            return {
                'is_real': False,
                'confidence': 0.0,
                'score': 0.0,
                'message': 'No frames provided'
            }
        
        results = [self.check_liveness(frame) for frame in frames]
        
        # Calculate average confidence
        confidences = [r['confidence'] for r in results]
        avg_confidence = sum(confidences) / len(confidences)
        
        # Majority voting for is_real
        real_count = sum(1 for r in results if r['is_real'])
        is_real = real_count > len(results) / 2
        
        return {
            'is_real': is_real,
            'confidence': avg_confidence,
            'score': avg_confidence,
            'message': f'Analyzed {len(frames)} frames. Real: {real_count}/{len(frames)}'
        }


# Singleton instance
_anti_spoof_service = None


def get_anti_spoofing_service(threshold: float = 0.8) -> AntiSpoofingService:
    """
    Get or create anti-spoofing service instance
    
    Args:
        threshold: Confidence threshold
        
    Returns:
        AntiSpoofingService instance
    """
    global _anti_spoof_service
    if _anti_spoof_service is None:
        _anti_spoof_service = AntiSpoofingService(threshold)
    return _anti_spoof_service
