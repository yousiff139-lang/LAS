import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';

/**
 * Face Service
 * Communicates with the Python face recognition microservice
 */

// Types
export interface FaceDetectionResult {
    success: boolean;
    faces_detected: number;
    face_locations: number[][];
    message: string;
}

export interface FaceEncodingResult {
    success: boolean;
    encoding: number[] | null;
    encoding_json: string | null;
    faces_detected: number;
    message: string;
}

export interface FaceVerificationResult {
    success: boolean;
    match: boolean;
    confidence: number;
    distance: number;
    faces_detected: number;
    message: string;
}

export interface AntiSpoofResult {
    is_real: boolean;
    confidence: number;
    score: number;
    message: string;
}

export interface FaceRegistrationResult {
    success: boolean;
    encoding: number[] | null;
    encoding_json: string | null;
    is_real: boolean;
    anti_spoof_score: number;
    faces_detected: number;
    message: string;
}

export interface FaceAuthenticationResult {
    success: boolean;
    match: boolean;
    is_real: boolean;
    confidence: number;
    anti_spoof_score: number;
    faces_detected: number;
    message: string;
}

class FaceRecognitionService {
    private client: AxiosInstance;
    private faceServiceUrl: string;

    constructor() {
        this.faceServiceUrl = process.env.FACE_SERVICE_URL || 'http://localhost:5000';

        this.client = axios.create({
            baseURL: this.faceServiceUrl,
            timeout: 30000, // 30 seconds
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Check if face service is available
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch (error) {
            console.error('Face service health check failed:', error);
            return false;
        }
    }

    /**
     * Detect faces in an image
     */
    async detectFaces(imageBase64: string): Promise<FaceDetectionResult> {
        try {
            const response = await this.client.post<FaceDetectionResult>('/api/detect', {
                image: imageBase64,
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Face detection failed');
        }
    }

    /**
     * Generate face encoding from image
     */
    async encodeFace(imageBase64: string): Promise<FaceEncodingResult> {
        try {
            const response = await this.client.post<FaceEncodingResult>('/api/encode', {
                image: imageBase64,
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Face encoding failed');
        }
    }

    /**
     * Verify face against known encoding
     */
    async verifyFace(imageBase64: string, knownEncoding: number[]): Promise<FaceVerificationResult> {
        try {
            const response = await this.client.post<FaceVerificationResult>('/api/verify', {
                image: imageBase64,
                known_encoding: knownEncoding,
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Face verification failed');
        }
    }

    /**
     * Check for spoofed faces (anti-spoofing)
     */
    async checkAntiSpoofing(imageBase64: string): Promise<AntiSpoofResult> {
        try {
            const response = await this.client.post<AntiSpoofResult>('/api/anti-spoof', {
                image: imageBase64,
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Anti-spoofing check failed');
        }
    }

    /**
     * Complete registration: anti-spoofing + encoding
     */
    async registerFace(imageBase64: string): Promise<FaceRegistrationResult> {
        try {
            const response = await this.client.post<FaceRegistrationResult>('/api/register', {
                image: imageBase64,
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Face registration failed');
        }
    }

    /**
     * Complete authentication: anti-spoofing + verification
     */
    async authenticateFace(imageBase64: string, knownEncoding: number[]): Promise<FaceAuthenticationResult> {
        try {
            const response = await this.client.post<FaceAuthenticationResult>('/api/authenticate', {
                image: imageBase64,
                known_encoding: knownEncoding,
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Face authentication failed');
        }
    }

    /**
     * Handle errors from face service
     */
    private handleError(error: any, defaultMessage: string): Error {
        if (error.response) {
            // Face service returned an error response
            const message = error.response.data?.detail || error.response.data?.message || defaultMessage;
            return new Error(message);
        } else if (error.request) {
            // No response from face service
            return new Error('Face recognition service is unavailable. Please try again later.');
        } else {
            // Other error
            return new Error(error.message || defaultMessage);
        }
    }
}

// Export singleton instance
export const faceService = new FaceRecognitionService();
