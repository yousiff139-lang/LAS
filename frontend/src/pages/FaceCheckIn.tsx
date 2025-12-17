import React, { useState } from 'react';
import FaceCapture from '../components/FaceCapture';
import { faceApi, studentApi, Student } from '../services/api';
import './Pages.css';

export const FaceCheckIn: React.FC = () => {
    const [step, setStep] = useState<'input' | 'capture' | 'processing' | 'success' | 'error'>('input');
    const [studentId, setStudentId] = useState('');
    const [student, setStudent] = useState<Student | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [capturedImage, setCapturedImage] = useState<string>('');

    const handleStudentIdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!studentId.trim()) {
            setError('Please enter your Student ID');
            return;
        }

        try {
            setError('');
            // Find student by biometric_user_id
            const response = await studentApi.getAll({ search: studentId.trim() });

            if (response.students && response.students.length > 0) {
                const foundStudent = response.students[0];
                setStudent(foundStudent);

                // Check if face is registered
                const statusResponse = await faceApi.getStatus(foundStudent.student_id);

                if (!statusResponse.has_face) {
                    setError('Your face is not registered. Please contact the administrator.');
                    return;
                }

                setStep('capture');
            } else {
                setError('Student not found. Please check your ID.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to verify student ID');
        }
    };

    const handleFaceCapture = async (imageData: string) => {
        if (!student) return;

        setStep('processing');
        setCapturedImage(imageData);

        try {
            const result = await faceApi.checkIn(student.student_id, imageData);

            if (result.success && result.match && result.is_real) {
                setMessage(`Welcome, ${student.name}! Attendance marked successfully.`);
                setStep('success');

                // Auto-redirect after 3 seconds
                setTimeout(() => {
                    resetForm();
                }, 3000);
            } else {
                setError(result.message || 'Face verification failed. Please try again.');
                setStep('error');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Check-in failed. Please try again.');
            setStep('error');
        }
    };

    const resetForm = () => {
        setStep('input');
        setStudentId('');
        setStudent(null);
        setMessage('');
        setError('');
        setCapturedImage('');
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Face Recognition Check-In</h1>
                <p>Verify your identity and mark attendance</p>
            </div>

            <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {step === 'input' && (
                    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                        <h2 style={{ marginBottom: '20px' }}>Enter Your Student ID</h2>
                        <form onSubmit={handleStudentIdSubmit}>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="Enter Student ID"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    fontSize: '18px',
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                }}
                                autoFocus
                            />
                            {error && (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: '#f44336',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    marginBottom: '20px',
                                }}>
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    fontSize: '18px',
                                    backgroundColor: '#4CAF50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                Continue
                            </button>
                        </form>
                    </div>
                )}

                {step === 'capture' && student && (
                    <div className="card" style={{ padding: '30px' }}>
                        <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>
                            Welcome, {student.name}
                        </h2>
                        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
                            Position your face in the oval and look at the camera
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <FaceCapture
                                onCapture={handleFaceCapture}
                                onError={setError}
                                width={480}
                                height={360}
                                showPreview={true}
                                autoCapture={true}
                                autoCapturDelay={3000}
                            />
                        </div>

                        <button
                            onClick={resetForm}
                            style={{
                                marginTop: '20px',
                                padding: '12px 24px',
                                backgroundColor: '#757575',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            border: '8px solid #4CAF50',
                            borderTop: '8px solid transparent',
                            borderRadius: '50%',
                            margin: '0 auto 30px',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <h2>Verifying your face...</h2>
                        <p style={{ color: '#666', marginTop: '10px' }}>Please wait</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            backgroundColor: '#4CAF50',
                            margin: '0 auto 30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '60px',
                            color: '#fff',
                        }}>
                            ✓
                        </div>
                        <h2 style={{ color: '#4CAF50', marginBottom: '10px' }}>
                            Check-In Successful!
                        </h2>
                        <p style={{ fontSize: '18px', color: '#666' }}>{message}</p>
                        <button
                            onClick={resetForm}
                            style={{
                                marginTop: '40px',
                                padding: '12px 24px',
                                backgroundColor: '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Check In Another Student
                        </button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            backgroundColor: '#f44336',
                            margin: '0 auto 30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '60px',
                            color: '#fff',
                        }}>
                            ✕
                        </div>
                        <h2 style={{ color: '#f44336', marginBottom: '10px' }}>
                            Check-In Failed
                        </h2>
                        <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
                            {error}
                        </p>
                        <button
                            onClick={() => setStep('capture')}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginRight: '10px',
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={resetForm}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#757575',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Start Over
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default FaceCheckIn;
