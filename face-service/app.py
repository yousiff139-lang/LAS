"""
Face Recognition API
FastAPI application for face detection, recognition, and anti-spoofing
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from dotenv import load_dotenv

from services import (
    get_face_recognition_service,
    get_anti_spoofing_service,
    ImageProcessor,
    validate_base64_image
)

# Load environment variables
load_dotenv()

# Configuration
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 5000))
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
FACE_MATCH_THRESHOLD = float(os.getenv('FACE_MATCH_THRESHOLD', 0.6))
ANTI_SPOOF_THRESHOLD = float(os.getenv('ANTI_SPOOF_THRESHOLD', 0.8))
MIN_FACE_SIZE = int(os.getenv('MIN_FACE_SIZE', 80))
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 
                           'http://localhost:5173,http://localhost:3000').split(',')

# Initialize FastAPI app
app = FastAPI(
    title="Face Recognition API",
    description="Face detection, recognition, and anti-spoofing service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
face_service = get_face_recognition_service(threshold=FACE_MATCH_THRESHOLD)
anti_spoof_service = get_anti_spoofing_service(threshold=ANTI_SPOOF_THRESHOLD)


# Request/Response Models
class ImageRequest(BaseModel):
    """Base request with image data"""
    image: str = Field(..., description="Base64 encoded image")


class FaceEncoding(BaseModel):
    """Face encoding data"""
    encoding: List[float] = Field(..., description="128-dimensional face encoding")


class VerifyRequest(BaseModel):
    """Face verification request"""
    image: str = Field(..., description="Base64 encoded image to verify")
    known_encoding: List[float] = Field(..., description="Stored face encoding")


class DetectionResponse(BaseModel):
    """Face detection response"""
    success: bool
    faces_detected: int
    face_locations: List[List[int]]
    message: str


class EncodingResponse(BaseModel):
    """Face encoding response"""
    success: bool
    encoding: Optional[List[float]]
    encoding_json: Optional[str]
    faces_detected: int
    message: str


class VerificationResponse(BaseModel):
    """Face verification response"""
    success: bool
    match: bool
    confidence: float
    distance: float
    faces_detected: int
    message: str


class AntiSpoofResponse(BaseModel):
    """Anti-spoofing response"""
    is_real: bool
    confidence: float
    score: float
    message: str


class RegisterResponse(BaseModel):
    """Complete registration response"""
    success: bool
    encoding: Optional[List[float]]
    encoding_json: Optional[str]
    is_real: bool
    anti_spoof_score: float
    faces_detected: int
    message: str


class AuthenticateResponse(BaseModel):
    """Complete authentication response"""
    success: bool
    match: bool
    is_real: bool
    confidence: float
    anti_spoof_score: float
    faces_detected: int
    message: str


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Face Recognition API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "face_recognition": "ready",
            "anti_spoofing": "ready"
        },
        "config": {
            "match_threshold": FACE_MATCH_THRESHOLD,
            "anti_spoof_threshold": ANTI_SPOOF_THRESHOLD,
            "min_face_size": MIN_FACE_SIZE
        }
    }


@app.post("/api/detect", response_model=DetectionResponse)
async def detect_faces(request: ImageRequest):
    """
    Detect all faces in an image
    """
    try:
        # Validate and convert image
        if not validate_base64_image(request.image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
        
        # Convert to OpenCV format
        image_bgr = ImageProcessor.base64_to_image(request.image)
        image_rgb = ImageProcessor.image_to_rgb(image_bgr)
        
        # Validate image size
        if not ImageProcessor.validate_image_size(image_rgb, MIN_FACE_SIZE):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image too small. Minimum size: {MIN_FACE_SIZE}x{MIN_FACE_SIZE}"
            )
        
        # Detect faces
        face_locations = face_service.detect_faces(image_rgb)
        
        return DetectionResponse(
            success=True,
            faces_detected=len(face_locations),
            face_locations=[list(loc) for loc in face_locations],
            message=f"Detected {len(face_locations)} face(s)"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face detection failed: {str(e)}"
        )


@app.post("/api/encode", response_model=EncodingResponse)
async def encode_face(request: ImageRequest):
    """
    Generate face encoding from image
    """
    try:
        # Validate and convert image
        if not validate_base64_image(request.image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
        
        # Convert to RGB
        image_bgr = ImageProcessor.base64_to_image(request.image)
        image_rgb = ImageProcessor.image_to_rgb(image_bgr)
        
        # Register face
        result = face_service.register_face(image_rgb)
        
        return EncodingResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face encoding failed: {str(e)}"
        )


@app.post("/api/verify", response_model=VerificationResponse)
async def verify_face(request: VerifyRequest):
    """
    Verify face against known encoding
    """
    try:
        # Validate and convert image
        if not validate_base64_image(request.image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
        
        # Convert to RGB
        image_bgr = ImageProcessor.base64_to_image(request.image)
        image_rgb = ImageProcessor.image_to_rgb(image_bgr)
        
        # Verify face
        result = face_service.verify_face(image_rgb, request.known_encoding)
        
        return VerificationResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face verification failed: {str(e)}"
        )


@app.post("/api/anti-spoof", response_model=AntiSpoofResponse)
async def check_anti_spoofing(request: ImageRequest):
    """
    Check if image contains real face or spoof
    """
    try:
        # Validate and convert image
        if not validate_base64_image(request.image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
        
        # Convert to BGR (OpenCV format for anti-spoofing)
        image_bgr = ImageProcessor.base64_to_image(request.image)
        
        # Check liveness
        result = anti_spoof_service.check_liveness(image_bgr)
        
        return AntiSpoofResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anti-spoofing check failed: {str(e)}"
        )


@app.post("/api/register", response_model=RegisterResponse)
async def register_complete(request: ImageRequest):
    """
    Complete registration: anti-spoofing + face encoding
    """
    try:
        # Validate and convert image
        if not validate_base64_image(request.image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
        
        # Convert image
        image_bgr = ImageProcessor.base64_to_image(request.image)
        image_rgb = ImageProcessor.image_to_rgb(image_bgr)
        
        # Step 1: Anti-spoofing check
        anti_spoof_result = anti_spoof_service.check_liveness(image_bgr)
        
        if not anti_spoof_result['is_real']:
            return RegisterResponse(
                success=False,
                encoding=None,
                encoding_json=None,
                is_real=False,
                anti_spoof_score=anti_spoof_result['confidence'],
                faces_detected=0,
                message=f"Registration failed: {anti_spoof_result['message']}"
            )
        
        # Step 2: Face encoding
        face_result = face_service.register_face(image_rgb)
        
        if not face_result['success']:
            return RegisterResponse(
                success=False,
                encoding=None,
                encoding_json=None,
                is_real=True,
                anti_spoof_score=anti_spoof_result['confidence'],
                faces_detected=face_result['faces_detected'],
                message=face_result['message']
            )
        
        return RegisterResponse(
            success=True,
            encoding=face_result['encoding'],
            encoding_json=face_result['encoding_json'],
            is_real=True,
            anti_spoof_score=anti_spoof_result['confidence'],
            faces_detected=1,
            message="Face registered successfully with liveness confirmation"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@app.post("/api/authenticate", response_model=AuthenticateResponse)
async def authenticate_complete(request: VerifyRequest):
    """
    Complete authentication: anti-spoofing + face verification
    """
    try:
        # Validate and convert image
        if not validate_base64_image(request.image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
        
        # Convert image
        image_bgr = ImageProcessor.base64_to_image(request.image)
        image_rgb = ImageProcessor.image_to_rgb(image_bgr)
        
        # Step 1: Anti-spoofing check
        anti_spoof_result = anti_spoof_service.check_liveness(image_bgr)
        
        if not anti_spoof_result['is_real']:
            return AuthenticateResponse(
                success=False,
                match=False,
                is_real=False,
                confidence=0.0,
                anti_spoof_score=anti_spoof_result['confidence'],
                faces_detected=0,
                message=f"Authentication failed: {anti_spoof_result['message']}"
            )
        
        # Step 2: Face verification
        verify_result = face_service.verify_face(image_rgb, request.known_encoding)
        
        if not verify_result['success']:
            return AuthenticateResponse(
                success=False,
                match=False,
                is_real=True,
                confidence=0.0,
                anti_spoof_score=anti_spoof_result['confidence'],
                faces_detected=verify_result['faces_detected'],
                message=verify_result['message']
            )
        
        return AuthenticateResponse(
            success=True,
            match=verify_result['match'],
            is_real=True,
            confidence=verify_result['confidence'],
            anti_spoof_score=anti_spoof_result['confidence'],
            faces_detected=1,
            message="Authenticated successfully" if verify_result['match'] else "Face does not match"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


# Run application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=DEBUG
    )
