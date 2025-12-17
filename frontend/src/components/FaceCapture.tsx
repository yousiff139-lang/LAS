import React, { useRef, useState, useEffect, useCallback } from 'react';

interface FaceCaptureProps {
    onCapture: (imageData: string) => void;
    onError?: (error: string) => void;
    width?: number;
    height?: number;
    showPreview?: boolean;
    autoCapture?: boolean;
    autoCapturDelay?: number;
}

export const FaceCapture: React.FC<FaceCaptureProps> = ({
    onCapture,
    onError,
    width = 640,
    height = 480,
    showPreview = true,
    autoCapture = false,
    autoCapturDelay = 3000,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [error, setError] = useState<string>('');

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: width },
                    height: { ideal: height },
                    facingMode: 'user',
                },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsReady(true);
                setError('');
            }
        } catch (err: any) {
            const errorMsg = err.name === 'NotAllowedError'
                ? 'Camera access denied. Please allow camera access to continue.'
                : err.name === 'NotFoundError'
                    ? 'No camera found. Please connect a camera and try again.'
                    : `Failed to access camera: ${err.message}`;

            setError(errorMsg);
            if (onError) onError(errorMsg);
        }
    }, [width, height, onError]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsReady(false);
        }
    }, [stream]);

    // Capture image
    const captureImage = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !isReady) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageData);
    }, [isReady, onCapture]);

    // Auto-capture with countdown
    useEffect(() => {
        if (!autoCapture || !isReady) return;

        let countdownValue = Math.ceil(autoCapturDelay / 1000);
        setCountdown(countdownValue);

        const countdownInterval = setInterval(() => {
            countdownValue -= 1;
            setCountdown(countdownValue);

            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                setCountdown(null);
                captureImage();
            }
        }, 1000);

        return () => clearInterval(countdownInterval);
    }, [autoCapture, autoCapturDelay, isReady, captureImage]);

    // Initialize camera on mount
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    return (
        <div className="face-capture-container">
            <div className="face-capture-video-wrapper" style={{ position: 'relative', width, height }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        display: showPreview ? 'block' : 'none',
                    }}
                />

                <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                />

                {/* Face detection overlay */}
                {isReady && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '60%',
                            height: '75%',
                            border: '3px solid rgba(76, 175, 80, 0.7)',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                        }}
                    />
                )}

                {/* Countdown overlay */}
                {countdown !== null && countdown > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '72px',
                            fontWeight: 'bold',
                            color: '#fff',
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                            zIndex: 10,
                        }}
                    >
                        {countdown}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            padding: '20px',
                            textAlign: 'center',
                            borderRadius: '8px',
                        }}
                    >
                        <div>
                            <p style={{ marginBottom: '10px' }}>{error}</p>
                            <button
                                onClick={startCamera}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#4CAF50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {!isReady && !error && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            borderRadius: '8px',
                        }}
                    >
                        <p>Starting camera...</p>
                    </div>
                )}
            </div>

            {/* Manual capture button */}
            {!autoCapture && isReady && (
                <button
                    onClick={captureImage}
                    style={{
                        marginTop: '16px',
                        padding: '12px 24px',
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    Capture Face
                </button>
            )}
        </div>
    );
};

export default FaceCapture;
