import React, { useState, useEffect } from 'react';
import FaceCapture from '../components/FaceCapture';
import { faceApi, studentApi, Student } from '../services/api';
import './Pages.css';

export const FaceRegistration: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'select' | 'capture' | 'success' | 'error'>('select');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadStudents();
    }, [searchTerm]);

    const loadStudents = async () => {
        try {
            const response = await studentApi.getAll({
                page: 1,
                limit: 100,
                search: searchTerm || undefined,
                status: 'active',
            });
            setStudents(response.students || []);
        } catch (err) {
            console.error('Failed to load students:', err);
        }
    };

    const handleStudentSelect = async (student: Student) => {
        setSelectedStudent(student);
        setError('');

        // Check if face is already registered
        try {
            const statusResponse = await faceApi.getStatus(student.student_id);
            if (statusResponse.has_face) {
                const confirmReregister = window.confirm(
                    `${student.name} already has a registered face. Do you want to re-register?`
                );
                if (!confirmReregister) {
                    setSelectedStudent(null);
                    return;
                }
            }
        } catch (err) {
            console.error('Error checking face status:', err);
        }

        setStep('capture');
    };

    const handleFaceCapture = async (imageData: string) => {
        if (!selectedStudent) return;

        setLoading(true);
        setError('');

        try {
            const result = await faceApi.register(selectedStudent.student_id, imageData);

            if (result.success) {
                setMessage(`Face registered successfully for ${selectedStudent.name}!`);
                setStep('success');

                // Reload students to update face status
                setTimeout(() => {
                    loadStudents();
                    resetForm();
                }, 2000);
            } else {
                setError(result.message || 'Face registration failed');
                setStep('error');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep('select');
        setSelectedStudent(null);
        setMessage('');
        setError('');
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Face Registration</h1>
                <p>Register student faces for attendance verification</p>
            </div>

            <div className="page-content">
                {step === 'select' && (
                    <div className="card">
                        <h2 style={{ marginBottom: '20px' }}>Select Student</h2>

                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '16px',
                                border: '2px solid #ddd',
                                borderRadius: '4px',
                                marginBottom: '20px',
                            }}
                        />

                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {students.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                                    No students found
                                </p>
                            ) : (
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {students.map((student) => (
                                        <div
                                            key={student.student_id}
                                            onClick={() => handleStudentSelect(student)}
                                            style={{
                                                padding: '16px',
                                                border: '2px solid #ddd',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#4CAF50';
                                                e.currentTarget.style.backgroundColor = '#f1f8f4';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#ddd';
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                                    {student.name}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#666' }}>
                                                    ID: {student.biometric_user_id} | {student.academic_stage}
                                                </div>
                                            </div>
                                            {student.face_encoding && (
                                                <span style={{
                                                    padding: '4px 12px',
                                                    backgroundColor: '#4CAF50',
                                                    color: '#fff',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                }}>
                                                    Registered
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'capture' && selectedStudent && (
                    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>
                            Registering: {selectedStudent.name}
                        </h2>
                        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
                            Position the student's face in the oval
                        </p>

                        <FaceCapture
                            onCapture={handleFaceCapture}
                            onError={setError}
                            width={480}
                            height={360}
                            showPreview={true}
                            autoCapture={false}
                        />

                        {error && (
                            <div style={{
                                marginTop: '20px',
                                padding: '12px',
                                backgroundColor: '#f44336',
                                color: '#fff',
                                borderRadius: '4px',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={resetForm}
                            disabled={loading}
                            style={{
                                marginTop: '20px',
                                padding: '12px 24px',
                                backgroundColor: '#757575',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                width: '100%',
                                opacity: loading ? 0.5 : 1,
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {step === 'success' && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
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
                            Registration Successful!
                        </h2>
                        <p style={{ fontSize: '18px', color: '#666' }}>{message}</p>
                    </div>
                )}

                {step === 'error' && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
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
                            Registration Failed
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
                            Back to Student List
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceRegistration;
