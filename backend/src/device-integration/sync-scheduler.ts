import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { Device } from '../models';
import { createTcpClient } from './tcp-client';
import { attendanceService } from '../services/attendance.service';
import { deviceService } from '../services/device.service';
import { env } from '../config/env';

/**
 * Device Sync Scheduler
 * Periodically syncs attendance logs from all active devices
 */
export class DeviceSyncScheduler {
    private isRunning: boolean = false;
    private cronJob: cron.ScheduledTask | null = null;
    private syncInterval: number;

    constructor(syncIntervalSeconds: number = env.device.syncIntervalSeconds) {
        this.syncInterval = syncIntervalSeconds;
    }

    /**
     * Start the sync scheduler
     */
    start(): void {
        if (this.isRunning) {
            console.log('Sync scheduler is already running');
            return;
        }

        console.log(`Starting device sync scheduler (every ${this.syncInterval} seconds)`);

        // Convert seconds to cron expression
        // For intervals less than 60 seconds, use setInterval instead
        if (this.syncInterval < 60) {
            this.startIntervalSync();
        } else {
            const minutes = Math.floor(this.syncInterval / 60);
            this.cronJob = cron.schedule(`*/${minutes} * * * *`, () => {
                this.syncAllDevices();
            });
        }

        this.isRunning = true;

        // Run initial sync
        setTimeout(() => this.syncAllDevices(), 5000);
    }

    /**
     * Start interval-based sync for short intervals
     */
    private startIntervalSync(): void {
        const intervalId = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(intervalId);
                return;
            }
            this.syncAllDevices();
        }, this.syncInterval * 1000);
    }

    /**
     * Stop the sync scheduler
     */
    stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        console.log('Device sync scheduler stopped');
    }

    /**
     * Sync all active devices
     */
    async syncAllDevices(): Promise<void> {
        console.log('Starting device sync...');

        try {
            const deviceRepository = AppDataSource.getRepository(Device);
            const devices = await deviceRepository.find({
                where: { is_active: true },
            });

            console.log(`Found ${devices.length} active devices`);

            for (const device of devices) {
                try {
                    await this.syncDevice(device);
                } catch (error: any) {
                    console.error(`Error syncing device ${device.biometric_device_id}:`, error.message);
                }
            }

            console.log('Device sync completed');
        } catch (error: any) {
            console.error('Error during device sync:', error.message);
        }
    }

    /**
     * Sync a single device
     */
    async syncDevice(device: Device): Promise<void> {
        console.log(`Syncing device: ${device.biometric_device_id}`);

        // Skip if no IP address (can't connect via TCP/IP)
        if (!device.ip_address) {
            console.log(`Device ${device.biometric_device_id} has no IP address, skipping TCP sync`);
            return;
        }

        const client = createTcpClient(device.ip_address);

        try {
            await client.connect();
            console.log(`Connected to device ${device.biometric_device_id}`);

            // Get attendance logs
            const logs = await client.getAttendanceLogs();
            console.log(`Retrieved ${logs.length} logs from device ${device.biometric_device_id}`);

            // Process each log
            let processed = 0;
            for (const log of logs) {
                try {
                    await attendanceService.processScan({
                        biometric_user_id: log.biometric_user_id,
                        timestamp: log.timestamp,
                        device_id: device.device_id,
                        event_type: log.event_type,
                    });
                    processed++;
                } catch (error: any) {
                    console.error(`Error processing log:`, error.message);
                }
            }

            console.log(`Processed ${processed} attendance records`);

            // Update last sync time
            await deviceService.updateLastSyncTime(device.device_id);

            await client.disconnect();
        } catch (error: any) {
            console.error(`Failed to sync device ${device.biometric_device_id}:`, error.message);
            try {
                await client.disconnect();
            } catch {
                // Ignore disconnect error
            }
        }
    }

    /**
     * Manually trigger sync for a specific device
     */
    async triggerSync(deviceId: string): Promise<{ success: boolean; message: string }> {
        try {
            const device = await deviceService.findById(deviceId);
            await this.syncDevice(device);
            return { success: true, message: 'Device synced successfully' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}

// Singleton instance
let schedulerInstance: DeviceSyncScheduler | null = null;

/**
 * Get or create the sync scheduler instance
 */
export function getSyncScheduler(): DeviceSyncScheduler {
    if (!schedulerInstance) {
        schedulerInstance = new DeviceSyncScheduler();
    }
    return schedulerInstance;
}

/**
 * Start the sync scheduler
 */
export function startSyncScheduler(): void {
    getSyncScheduler().start();
}

/**
 * Stop the sync scheduler
 */
export function stopSyncScheduler(): void {
    getSyncScheduler().stop();
}
