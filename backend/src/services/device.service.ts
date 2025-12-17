import { AppDataSource } from '../config/database';
import { Device } from '../models';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const deviceRepository = AppDataSource.getRepository(Device);

export interface CreateDeviceDto {
    biometric_device_id: string;
    ip_address?: string;
    rs485_address?: string;
    usb_enabled?: boolean;
    aosp_connection_enabled?: boolean;
    location?: string;
    serial_port?: string;
    baud_rate?: number;
}

export interface UpdateDeviceDto extends Partial<CreateDeviceDto> {
    is_active?: boolean;
}

export const deviceService = {
    async findAll() {
        return deviceRepository.find({
            order: { created_at: 'DESC' },
        });
    },

    async findById(deviceId: string) {
        const device = await deviceRepository.findOne({
            where: { device_id: deviceId },
            relations: ['raw_logs'],
        });

        if (!device) {
            throw new AppError('Device not found', 404);
        }

        return device;
    },

    async findByBiometricDeviceId(biometricDeviceId: string) {
        return deviceRepository.findOne({
            where: { biometric_device_id: biometricDeviceId },
        });
    },

    async findByAospToken(token: string) {
        return deviceRepository.findOne({
            where: { aosp_token: token, aosp_connection_enabled: true },
        });
    },

    async create(data: CreateDeviceDto) {
        // Check if device ID already exists
        const existing = await deviceRepository.findOne({
            where: { biometric_device_id: data.biometric_device_id },
        });

        if (existing) {
            throw new AppError('Device with this ID already exists', 400);
        }

        // Generate AOSP token if enabled
        const aosp_token = data.aosp_connection_enabled ? uuidv4() : undefined;

        const device = deviceRepository.create({
            ...data,
            aosp_token,
        });

        return deviceRepository.save(device);
    },

    async update(deviceId: string, data: UpdateDeviceDto) {
        const device = await this.findById(deviceId);

        // Check if new biometric device ID conflicts with existing
        if (data.biometric_device_id && data.biometric_device_id !== device.biometric_device_id) {
            const existing = await deviceRepository.findOne({
                where: { biometric_device_id: data.biometric_device_id },
            });

            if (existing) {
                throw new AppError('Device with this ID already exists', 400);
            }
        }

        // Regenerate AOSP token if enabling AOSP connection
        if (data.aosp_connection_enabled && !device.aosp_connection_enabled) {
            data.aosp_token = uuidv4();
        }

        Object.assign(device, data);
        return deviceRepository.save(device);
    },

    async delete(deviceId: string) {
        const device = await this.findById(deviceId);
        await deviceRepository.remove(device);
        return { message: 'Device deleted successfully' };
    },

    async updateLastSyncTime(deviceId: string) {
        await deviceRepository.update(deviceId, { last_sync_time: new Date() });
    },

    async regenerateAospToken(deviceId: string) {
        const device = await this.findById(deviceId);

        if (!device.aosp_connection_enabled) {
            throw new AppError('AOSP connection is not enabled for this device', 400);
        }

        device.aosp_token = uuidv4();
        return deviceRepository.save(device);
    },

    async getDeviceStatus(deviceId: string) {
        const device = await this.findById(deviceId);

        // Calculate logs count
        const logsCount = device.raw_logs?.length || 0;

        return {
            device_id: device.device_id,
            biometric_device_id: device.biometric_device_id,
            is_active: device.is_active,
            last_sync_time: device.last_sync_time,
            logs_count: logsCount,
            connection_modes: {
                tcp_ip: !!device.ip_address,
                rs485: !!device.rs485_address,
                usb: device.usb_enabled,
                aosp: device.aosp_connection_enabled,
            },
        };
    },
};
