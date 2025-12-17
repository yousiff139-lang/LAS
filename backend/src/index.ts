import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Routes
import studentRoutes from './routes/student.routes';
import lectureRoutes from './routes/lecture.routes';
import subjectRoutes from './routes/subject.routes';
import deviceRoutes from './routes/device.routes';
import attendanceRoutes from './routes/attendance.routes';
import aospRoutes from './routes/aosp.routes';
import publicRoutes from './routes/public.routes';
import authRoutes from './routes/auth.routes';
import faceRoutes from './routes/face.routes';

// Services
import { adminService } from './services/admin.service';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.nodeEnv,
    });
});

// Authentication Routes (public)
app.use('/api/v1/auth', authRoutes);

// Admin API Routes
app.use('/api/v1/admin/students', studentRoutes);
app.use('/api/v1/admin/lectures', lectureRoutes);
app.use('/api/v1/admin/subjects', subjectRoutes);
app.use('/api/v1/admin/devices', deviceRoutes);
app.use('/api/v1/admin/attendance', attendanceRoutes);

// Device API Routes
app.use('/api/v1/aosp', aospRoutes);
app.use('/api/v1', publicRoutes);

// Face Recognition Routes
app.use('/api/v1/face', faceRoutes);

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        await initializeDatabase();

        // Seed initial admin if none exists
        try {
            const admin = await adminService.seedInitialAdmin();
            if (admin) {
                console.log('✅ Initial admin created: admin / Admin@123');
                console.log('⚠️  Please change the default password immediately!');
            }
        } catch (seedError) {
            console.log('Admin seeding skipped:', seedError);
        }

        app.listen(env.port, () => {
            console.log(`🚀 Server running on port ${env.port}`);
            console.log(`📍 Environment: ${env.nodeEnv}`);
            console.log(`🔗 Health check: http://localhost:${env.port}/health`);
            console.log(`🔐 Auth endpoints: http://localhost:${env.port}/api/v1/auth`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;

