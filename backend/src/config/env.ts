import dotenv from 'dotenv';

dotenv.config();

export const env = {
    // Server
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        name: process.env.DATABASE_NAME || 'lecture_attendance',
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'password',
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'default_secret_change_me',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // AOSP
    aosp: {
        secretKey: process.env.AOSP_SECRET_KEY || 'aosp_default_secret',
    },

    // Device Integration
    device: {
        syncIntervalSeconds: parseInt(process.env.DEVICE_SYNC_INTERVAL_SECONDS || '30'),
        gracePeriodMinutes: parseInt(process.env.ATTENDANCE_GRACE_PERIOD_MINUTES || '15'),
        lateThresholdMinutes: parseInt(process.env.LATE_THRESHOLD_MINUTES || '10'),
    },

    // Serial Port
    serial: {
        defaultPort: process.env.DEFAULT_SERIAL_PORT || 'COM1',
        defaultBaudRate: parseInt(process.env.DEFAULT_BAUD_RATE || '115200'),
    },

    // TCP/IP
    tcp: {
        defaultDevicePort: parseInt(process.env.DEFAULT_DEVICE_PORT || '4370'),
    },
};
