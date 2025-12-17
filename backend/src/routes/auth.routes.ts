import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Admin login - email only
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
            });
        }

        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await adminService.login(
            { email },
            ipAddress,
            userAgent
        );

        res.json({
            message: 'Login successful',
            token: result.token,
            admin: result.admin,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/auth/logout
 * Admin logout - invalidate token
 */
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const adminId = req.user?.id;
        const ipAddress = req.ip || req.socket.remoteAddress;

        if (token && adminId) {
            await adminService.logout(token, adminId, ipAddress);
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/auth/me
 * Get current admin info
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user?.id;

        if (!adminId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const admin = await adminService.getMe(adminId);
        res.json(admin);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/auth/change-password
 * Change admin password
 */
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user?.id;
        const { current_password, new_password } = req.body;
        const ipAddress = req.ip || req.socket.remoteAddress;

        if (!adminId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!current_password || !new_password) {
            return res.status(400).json({
                error: 'Current password and new password are required',
            });
        }

        await adminService.changePassword(
            adminId,
            { current_password, new_password },
            ipAddress
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/auth/setup
 * Initial admin setup (only works if no admin exists)
 */
router.post('/setup', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hasAdmin = await adminService.hasAnyAdmin();

        if (hasAdmin) {
            return res.status(400).json({
                error: 'Admin already exists. Use login instead.',
            });
        }

        const { username, password, full_name, email } = req.body;

        if (!username || !password || !full_name) {
            return res.status(400).json({
                error: 'Username, password, and full_name are required',
            });
        }

        const admin = await adminService.create({
            username,
            password,
            full_name,
            email,
        });

        res.status(201).json({
            message: 'Admin created successfully',
            admin,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/auth/check-setup
 * Check if initial setup is needed
 */
router.get('/check-setup', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hasAdmin = await adminService.hasAnyAdmin();

        res.json({
            setup_required: !hasAdmin,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
