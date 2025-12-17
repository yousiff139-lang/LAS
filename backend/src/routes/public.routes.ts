import { Router, Request, Response, NextFunction } from 'express';
import { lectureService } from '../services/lecture.service';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';

const router = Router();

// GET /api/v1/lectures/today - Public endpoint for today's lectures
router.get('/lectures/today', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lectures = await lectureService.findToday();
        res.json({ success: true, lectures });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/student/:id - Get student info by ID
router.get('/student/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const student = await studentService.findById(req.params.id);
        res.json({
            success: true,
            student: {
                student_id: student.student_id,
                biometric_user_id: student.biometric_user_id,
                name: student.name,
                department: student.department,
                status: student.status,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/device/logs - Device log submission (for TCP/IP or serial devices)
router.post('/device/logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { biometric_user_id, timestamp, device_id, event_type } = req.body;

        if (!biometric_user_id || !timestamp) {
            return res.status(400).json({
                success: false,
                error: 'biometric_user_id and timestamp are required',
            });
        }

        const result = await attendanceService.processScan({
            biometric_user_id,
            timestamp,
            device_id,
            event_type,
        });

        res.json({
            success: true,
            message: result ? 'Attendance recorded' : 'Log stored',
            attendance: result,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
