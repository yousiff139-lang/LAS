import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const authMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.jwt.secret) as {
            id: string;
            role: string;
        };

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Invalid token', 401));
        } else {
            next(error);
        }
    }
};

// Middleware specifically for AOSP device authentication
export const aospAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        const deviceToken = req.headers['x-device-token'] as string;

        // Check for device-specific token
        if (deviceToken) {
            // In production, validate against database
            // For now, accept if format is valid
            if (deviceToken.length >= 32) {
                return next();
            }
        }

        // Check for standard bearer token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            // Verify against AOSP secret key
            if (token === env.aosp.secretKey) {
                return next();
            }

            // Try JWT verification
            try {
                jwt.verify(token, env.jwt.secret);
                return next();
            } catch {
                // Continue to error
            }
        }

        throw new AppError('AOSP authentication failed', 401);
    } catch (error) {
        next(error);
    }
};
