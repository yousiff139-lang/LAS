"""
Face Utilities Module
Handles image loading, validation, and preprocessing
"""
import base64
import io
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional


class ImageProcessor:
    """Utility class for image processing operations"""
    
    @staticmethod
    def base64_to_image(base64_string: str) -> np.ndarray:
        """
        Convert base64 string to OpenCV image
        
        Args:
            base64_string: Base64 encoded image string
            
        Returns:
            OpenCV image (BGR format)
        """
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to bytes
        img_bytes = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(img_bytes))
        
        # Convert to RGB if needed
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to numpy array (RGB)
        img_array = np.array(pil_image)
        
        # Convert RGB to BGR for OpenCV
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        return img_bgr
    
    @staticmethod
    def image_to_rgb(image: np.ndarray) -> np.ndarray:
        """
        Convert BGR image to RGB
        
        Args:
            image: OpenCV image in BGR format
            
        Returns:
            Image in RGB format
        """
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    @staticmethod
    def validate_image_size(image: np.ndarray, min_size: int = 80) -> bool:
        """
        Check if image is large enough for face detection
        
        Args:
            image: Image array
            min_size: Minimum dimension in pixels
            
        Returns:
            True if image is valid
        """
        height, width = image.shape[:2]
        return height >= min_size and width >= min_size
    
    @staticmethod
    def resize_image(image: np.ndarray, max_dimension: int = 1024) -> np.ndarray:
        """
        Resize image if it's too large
        
        Args:
            image: Input image
            max_dimension: Maximum width or height
            
        Returns:
            Resized image
        """
        height, width = image.shape[:2]
        
        if height <= max_dimension and width <= max_dimension:
            return image
        
        # Calculate scaling factor
        scale = min(max_dimension / height, max_dimension / width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    @staticmethod
    def draw_face_box(image: np.ndarray, location: Tuple[int, int, int, int], 
                      label: str = "", color: Tuple[int, int, int] = (0, 255, 0)) -> np.ndarray:
        """
        Draw bounding box on face
        
        Args:
            image: Image to draw on
            location: Face location (top, right, bottom, left)
            label: Optional label text
            color: Box color in BGR
            
        Returns:
            Image with bounding box
        """
        top, right, bottom, left = location
        
        # Draw rectangle
        cv2.rectangle(image, (left, top), (right, bottom), color, 2)
        
        # Draw label if provided
        if label:
            cv2.putText(image, label, (left, top - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return image


def validate_base64_image(base64_string: str) -> bool:
    """
    Validate that a base64 string represents a valid image
    
    Args:
        base64_string: Base64 encoded string
        
    Returns:
        True if valid image
    """
    try:
        ImageProcessor.base64_to_image(base64_string)
        return True
    except Exception:
        return False


def extract_face_region(image: np.ndarray, location: Tuple[int, int, int, int], 
                       padding: int = 20) -> Optional[np.ndarray]:
    """
    Extract face region from image with padding
    
    Args:
        image: Source image
        location: Face location (top, right, bottom, left)
        padding: Padding in pixels
        
    Returns:
        Cropped face region or None
    """
    try:
        height, width = image.shape[:2]
        top, right, bottom, left = location
        
        # Add padding
        top = max(0, top - padding)
        left = max(0, left - padding)
        bottom = min(height, bottom + padding)
        right = min(width, right + padding)
        
        # Extract region
        face_region = image[top:bottom, left:right]
        
        return face_region if face_region.size > 0 else None
    except Exception:
        return None
