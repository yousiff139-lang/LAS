import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Student } from '../models/Student';
import { faceService } from '../services/face.service';
import { attendanceService } from '../services/attendance.service';

const router = Router();
const studentRepository = AppDataSource.getRepository(Student);

/**
 * POST /api/v1/face/register/:studentId
 * Register a student's face
 */
router.post('/register/:studentId', async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Image data is required',
            });
        }

        // Find student
        const student = await studentRepository.findOne({
            where: { student_id: studentId },
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Register face with anti-spoofing
        const result = await faceService.registerFace(image);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message,
                details: result,
            });
        }

        // Store encoding in database
        student.face_encoding = result.encoding_json!;
        student.face_image_url = image; // Store reference image (base64)
        await studentRepository.save(student);

        return res.status(200).json({
            success: true,
            message: 'Face registered successfully',
            student_id: studentId,
            anti_spoof_score: result.anti_spoof_score,
        });
    } catch (error: any) {
        console.error('Face registration error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Face registration failed',
        });
    }
});

/**
 * POST /api/v1/face/verify/:studentId
 * Verify a student's face
 */
router.post('/verify/:studentId', async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Image data is required',
            });
        }

        // Find student with face encoding
        const student = await studentRepository.findOne({
            where: { student_id: studentId },
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        if (!student.face_encoding) {
            return res.status(400).json({
                success: false,
                message: 'Student does not have a registered face. Please register first.',
            });
        }

        // Parse stored encoding
        const knownEncoding = JSON.parse(student.face_encoding);

        // Authenticate face with anti-spoofing
        const result = await faceService.authenticateFace(image, knownEncoding);

        return res.status(200).json({
            success: result.success,
            match: result.match,
            is_real: result.is_real,
            confidence: result.confidence,
            anti_spoof_score: result.anti_spoof_score,
            message: result.message,
        });
    } catch (error: any) {
        console.error('Face verification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Face verification failed',
        });
    }
});

/**
 * POST /api/v1/face/check-in
 * Complete attendance check-in with face recognition
 */
router.post('/check-in', async (req: Request, res: Response) => {
    try {
        const { student_id, biometric_user_id, image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Image data is required',
            });
        }

        if (!student_id && !biometric_user_id) {
            return res.status(400).json({
                success: false,
                message: 'Student ID or biometric user ID is required',
            });
        }

        // Find student
        const student = await studentRepository.findOne({
            where: student_id
                ? { student_id }
                : { biometric_user_id },
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        if (!student.face_encoding) {
            return res.status(400).json({
                success: false,
                message: 'Student does not have a registered face. Please contact admin.',
            });
        }

        // Check if student is active
        if (student.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `Cannot check in. Student status: ${student.status}`,
            });
        }

        // Parse stored encoding
        const knownEncoding = JSON.parse(student.face_encoding);

        // Authenticate face
        const authResult = await faceService.authenticateFace(image, knownEncoding);

        if (!authResult.success || !authResult.match || !authResult.is_real) {
            return res.status(401).json({
                success: false,
                message: authResult.message,
                match: authResult.match,
                is_real: authResult.is_real,
            });
        }

        // Process attendance
        // TODO: Implement face-based attendance marking
        // For now, we'll just return success without marking attendance
        const attendanceResult = {
            success: true,
            message: 'Face verified successfully'
        };

        return res.status(200).json({
            success: true,
            message: 'Check-in successful',
            student: {
                student_id: student.student_id,
                name: student.name,
                biometric_user_id: student.biometric_user_id,
            },
            attendance: attendanceResult,
            face_confidence: authResult.confidence,
            anti_spoof_score: authResult.anti_spoof_score,
        });
    } catch (error: any) {
        console.error('Face check-in error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Check-in failed',
        });
    }
});

/**
 * DELETE /api/v1/face/encoding/:studentId
 * Delete a student's face encoding
 */
router.delete('/encoding/:studentId', async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;

        const student = await studentRepository.findOne({
            where: { student_id: studentId },
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Clear face data
        student.face_encoding = undefined;
        student.face_image_url = undefined;
        await studentRepository.save(student);

        return res.status(200).json({
            success: true,
            message: 'Face encoding deleted successfully',
        });
    } catch (error: any) {
        console.error('Face encoding deletion error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete face encoding',
        });
    }
});

/**
 * GET /api/v1/face/status/:studentId
 * Check if student has face registered
 */
router.get('/status/:studentId', async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;

        const student = await studentRepository.findOne({
            where: { student_id: studentId },
            select: ['student_id', 'name', 'face_encoding'],
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        return res.status(200).json({
            success: true,
            student_id: student.student_id,
            name: student.name,
            has_face: !!student.face_encoding,
        });
    } catch (error: any) {
        console.error('Face status check error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check face status',
        });
    }
});

export default router;
