import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { lectureService, CreateLectureDto, UpdateLectureDto, LectureFilters } from '../services/lecture.service';
import { excelImportService } from '../utils/excel-import';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'text/csv'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel and CSV files are allowed'));
        }
    },
});

// GET /api/v1/admin/lectures - List all lectures
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: LectureFilters = {
            course_name: req.query.course_name as string,
            lecturer_name: req.query.lecturer_name as string,
            day_of_week: req.query.day_of_week ? parseInt(req.query.day_of_week as string) : undefined,
            date: req.query.date as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50,
        };

        const result = await lectureService.findAll(filters);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/lectures/today - Get today's lectures
router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lectures = await lectureService.findToday();
        res.json({ success: true, lectures });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/lectures/:id - Get single lecture
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lecture = await lectureService.findById(req.params.id);
        res.json({ success: true, lecture });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/lectures - Create new lecture
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: CreateLectureDto = req.body;
        const lecture = await lectureService.create(data);
        res.status(201).json({ success: true, lecture });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/lectures/import - Import lectures from Excel
router.post('/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const lectures = await excelImportService.parseLectureSchedule(req.file.buffer);
        const created = await lectureService.createMany(lectures);

        res.status(201).json({
            success: true,
            message: `Successfully imported ${created.length} lectures`,
            lectures: created,
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/admin/lectures/:id - Update lecture
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: UpdateLectureDto = req.body;
        const lecture = await lectureService.update(req.params.id, data);
        res.json({ success: true, lecture });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/lectures/:id - Delete lecture
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await lectureService.delete(req.params.id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

export default router;
