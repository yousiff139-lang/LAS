import { Router, Request, Response, NextFunction } from 'express';
import { attendanceService, AttendanceFilters } from '../services/attendance.service';
import { AttendanceStatus } from '../models';
import { excelExportService } from '../utils/excel-export';

const router = Router();

// GET /api/v1/admin/attendance - List attendance records
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: AttendanceFilters = {
            lecture_id: req.query.lecture_id as string,
            student_id: req.query.student_id as string,
            date: req.query.date as string,
            status: req.query.status as AttendanceStatus,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50,
        };

        const result = await attendanceService.findAll(filters);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/attendance/summary - Get attendance summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { lecture_id, date } = req.query;

        if (!lecture_id || !date) {
            return res.status(400).json({
                success: false,
                error: 'lecture_id and date are required',
            });
        }

        const summary = await attendanceService.getSummary(lecture_id as string, date as string);
        res.json({ success: true, summary });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/attendance/export - Export attendance to Excel
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: AttendanceFilters = {
            lecture_id: req.query.lecture_id as string,
            student_id: req.query.student_id as string,
            date: req.query.date as string,
            status: req.query.status as AttendanceStatus,
            limit: 10000, // Export up to 10000 records
        };

        const { records } = await attendanceService.findAll(filters);
        const buffer = await excelExportService.exportAttendance(records);

        const filename = `attendance_${filters.date || 'all'}_${Date.now()}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/attendance/mark-absent - Mark absent students
router.post('/mark-absent', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { lecture_id, date } = req.body;

        if (!lecture_id || !date) {
            return res.status(400).json({
                success: false,
                error: 'lecture_id and date are required',
            });
        }

        const result = await attendanceService.markAbsent(lecture_id, date);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

export default router;
