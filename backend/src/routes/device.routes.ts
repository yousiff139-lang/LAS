import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { deviceService, CreateDeviceDto, UpdateDeviceDto } from '../services/device.service';
import { usbImportService } from '../device-integration/usb-import';
import { attendanceService } from '../services/attendance.service';

const router = Router();

// Configure multer for USB file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for USB files
});

// GET /api/v1/admin/devices - List all devices
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const devices = await deviceService.findAll();
        res.json({ success: true, devices });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/devices/:id - Get single device
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const device = await deviceService.findById(req.params.id);
        res.json({ success: true, device });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/devices/:id/status - Get device status
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = await deviceService.getDeviceStatus(req.params.id);
        res.json({ success: true, status });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/devices - Create new device
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: CreateDeviceDto = req.body;
        const device = await deviceService.create(data);
        res.status(201).json({ success: true, device });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/admin/devices/:id - Update device
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: UpdateDeviceDto = req.body;
        const device = await deviceService.update(req.params.id, data);
        res.json({ success: true, device });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/devices/:id - Delete device
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await deviceService.delete(req.params.id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/devices/:id/regenerate-token - Regenerate AOSP token
router.post('/:id/regenerate-token', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const device = await deviceService.regenerateAospToken(req.params.id);
        res.json({ success: true, device, message: 'AOSP token regenerated' });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/devices/:id/import-usb - Import logs from USB file
router.post('/:id/import-usb', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const device = await deviceService.findById(req.params.id);
        const logs = await usbImportService.parseFile(req.file.buffer, req.file.originalname);

        // Process each log as a scan event
        const results = await attendanceService.processBatchScans(
            logs.map(log => ({
                biometric_user_id: log.biometric_user_id,
                timestamp: log.timestamp,
                device_id: device.device_id,
                event_type: log.event_type as any,
            }))
        );

        const successful = results.filter(r => r.success).length;

        res.json({
            success: true,
            message: `Imported ${logs.length} logs, ${successful} attendance records created`,
            total_logs: logs.length,
            records_created: successful,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
