import { Router, Response, NextFunction } from 'express';
import { subjectService } from '../services/subject.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { SubjectStatus, AcademicStage } from '../models';

const router = Router();

/**
 * GET /api/v1/admin/subjects
 * List all subjects with filters
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            status,
            academic_stage,
            day_of_week,
            page = '1',
            limit = '50',
        } = req.query;

        const result = await subjectService.findAll({
            status: status as SubjectStatus,
            academic_stage: academic_stage as AcademicStage,
            day_of_week: day_of_week ? parseInt(day_of_week as string) : undefined,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/admin/subjects/active/today
 * Get active subjects for today
 */
router.get('/active/today', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const subjects = await subjectService.findActiveToday();
        res.json(subjects);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/admin/subjects/stage/:stage
 * Get subjects by academic stage
 */
router.get('/stage/:stage', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { stage } = req.params;
        const subjects = await subjectService.findByAcademicStage(stage as AcademicStage);
        res.json(subjects);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/admin/subjects/:id
 * Get subject by ID
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const subject = await subjectService.findById(req.params.id);
        res.json(subject);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/admin/subjects
 * Create a new subject
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            subject_code,
            subject_name,
            day_of_week,
            specific_date,
            start_time,
            end_time,
            academic_stage,
            status,
            location,
            instructor_name,
        } = req.body;

        if (!subject_code || !subject_name || !start_time || !end_time) {
            return res.status(400).json({
                error: 'subject_code, subject_name, start_time, and end_time are required',
            });
        }

        const adminId = req.user?.id;
        const ipAddress = req.ip || req.socket.remoteAddress;

        const subject = await subjectService.create(
            {
                subject_code,
                subject_name,
                day_of_week,
                specific_date,
                start_time,
                end_time,
                academic_stage,
                status,
                location,
                instructor_name,
            },
            adminId,
            ipAddress
        );

        res.status(201).json(subject);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/admin/subjects/:id
 * Update a subject
 */
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user?.id;
        const ipAddress = req.ip || req.socket.remoteAddress;

        const subject = await subjectService.update(
            req.params.id,
            req.body,
            adminId,
            ipAddress
        );

        res.json(subject);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/v1/admin/subjects/:id
 * Delete a subject
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user?.id;
        const ipAddress = req.ip || req.socket.remoteAddress;

        await subjectService.delete(req.params.id, adminId, ipAddress);

        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/admin/subjects/:id/toggle-status
 * Toggle subject active/inactive status
 */
router.post('/:id/toggle-status', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user?.id;
        const ipAddress = req.ip || req.socket.remoteAddress;

        const subject = await subjectService.toggleStatus(req.params.id, adminId, ipAddress);

        res.json(subject);
    } catch (error) {
        next(error);
    }
});

export default router;
