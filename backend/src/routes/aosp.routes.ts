import { Router, Request, Response, NextFunction } from 'express';
import { aospAuthMiddleware } from '../middleware/auth';
import { attendanceService } from '../services/attendance.service';
import { deviceService } from '../services/device.service';
import { lectureService } from '../services/lecture.service';

const router = Router();

// Apply AOSP authentication to all routes
router.use(aospAuthMiddleware);

// POST /api/v1/aosp/logs - Receive live scan event from AOSP device
router.post('/logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { biometric_user_id, timestamp, device_token, event_type } = req.body;

        if (!biometric_user_id || !timestamp) {
            return res.status(400).json({
                success: false,
                error: 'biometric_user_id and timestamp are required',
            });
        }

        // Find device by token if provided
        let device_id: string | undefined;
        if (device_token) {
            const device = await deviceService.findByAospToken(device_token);
            if (device) {
                device_id = device.device_id;
            }
        }

        const result = await attendanceService.processScan({
            biometric_user_id,
            timestamp,
            device_id,
            event_type,
        });

        res.json({
            success: true,
            message: result ? 'Attendance recorded' : 'Log stored (no matching lecture or duplicate)',
            attendance: result,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/aosp/sync - Batch sync logs from AOSP device
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { logs, device_token } = req.body;

        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({
                success: false,
                error: 'logs array is required',
            });
        }

        // Find device by token if provided
        let device_id: string | undefined;
        if (device_token) {
            const device = await deviceService.findByAospToken(device_token);
            if (device) {
                device_id = device.device_id;
            }
        }

        // Add device_id to each log
        const logsWithDevice = logs.map(log => ({
            ...log,
            device_id: device_id || log.device_id,
        }));

        const results = await attendanceService.processBatchScans(logsWithDevice);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        // Update device last sync time
        if (device_id) {
            await deviceService.updateLastSyncTime(device_id);
        }

        res.json({
            success: true,
            message: `Processed ${logs.length} logs`,
            total: logs.length,
            successful,
            failed: failed.length,
            errors: failed.length > 0 ? failed : undefined,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/aosp/device-config - Get device configuration for AOSP
router.get('/device-config', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deviceToken = req.headers['x-device-token'] as string;

        if (!deviceToken) {
            return res.status(400).json({
                success: false,
                error: 'x-device-token header is required',
            });
        }

        const device = await deviceService.findByAospToken(deviceToken);

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found',
            });
        }

        // Get today's lectures for the device
        const todayLectures = await lectureService.findToday();

        res.json({
            success: true,
            device: {
                device_id: device.device_id,
                biometric_device_id: device.biometric_device_id,
                location: device.location,
            },
            config: {
                sync_interval_seconds: 30,
                push_enabled: true,
                time_zone: 'UTC',
            },
            lectures: todayLectures.map(l => ({
                lecture_id: l.lecture_id,
                course_name: l.course_name,
                start_time: l.start_time,
                end_time: l.end_time,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/aosp/heartbeat - Device heartbeat
router.post('/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deviceToken = req.headers['x-device-token'] as string;

        if (deviceToken) {
            const device = await deviceService.findByAospToken(deviceToken);
            if (device) {
                await deviceService.updateLastSyncTime(device.device_id);
            }
        }

        res.json({
            success: true,
            server_time: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
