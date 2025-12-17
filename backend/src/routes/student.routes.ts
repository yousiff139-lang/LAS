import { Router, Request, Response, NextFunction } from 'express';
import { studentService, CreateStudentDto, UpdateStudentDto, StudentFilters } from '../services/student.service';
import { StudentStatus } from '../models';

const router = Router();

// GET /api/v1/admin/students - List all students with filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: StudentFilters = {
            department: req.query.department as string,
            status: req.query.status as StudentStatus,
            search: req.query.search as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50,
        };

        const result = await studentService.findAll(filters);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/students/:id - Get single student
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const student = await studentService.findById(req.params.id);
        res.json({ success: true, student });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/students - Create new student
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: CreateStudentDto = req.body;
        const student = await studentService.create(data);
        res.status(201).json({ success: true, student });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/admin/students/:id - Update student
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: UpdateStudentDto = req.body;
        const student = await studentService.update(req.params.id, data);
        res.json({ success: true, student });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/students/:id - Delete student
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await studentService.delete(req.params.id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/students/:id/sync-to-device - Sync student to device
router.post('/:id/sync-to-device', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { device_id } = req.body;
        const result = await studentService.syncToDevice(req.params.id, device_id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

export default router;
