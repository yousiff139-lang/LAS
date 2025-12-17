import { EventEmitter } from 'events';
import { env } from '../config/env';

/**
 * Serial Client for FingerTec Face ID 2 Device Communication
 * Supports RS232 and RS485 protocols
 * 
 * Note: This module requires the 'serialport' package to be installed.
 * On Windows, you may need additional setup for serial port access.
 */
export class SerialDeviceClient extends EventEmitter {
    private port: any = null; // SerialPort instance
    private portPath: string;
    private baudRate: number;
    private connected: boolean = false;
    private buffer: Buffer = Buffer.alloc(0);
    private rs485Address: string;

    constructor(
        portPath: string = env.serial.defaultPort,
        baudRate: number = env.serial.defaultBaudRate,
        rs485Address: string = '1'
    ) {
        super();
        this.portPath = portPath;
        this.baudRate = baudRate;
        this.rs485Address = rs485Address;
    }

    /**
     * Connect to the serial port
     */
    async connect(): Promise<boolean> {
        try {
            // Dynamic import to avoid errors if serialport is not available
            const { SerialPort } = await import('serialport');

            return new Promise((resolve, reject) => {
                this.port = new SerialPort({
                    path: this.portPath,
                    baudRate: this.baudRate,
                    dataBits: 8,
                    stopBits: 1,
                    parity: 'none',
                    autoOpen: false,
                });

                this.port.open((err: Error | null) => {
                    if (err) {
                        console.error('Error opening serial port:', err.message);
                        reject(err);
                        return;
                    }

                    console.log(`Serial port ${this.portPath} opened at ${this.baudRate} baud`);
                    this.connected = true;
                    this.emit('connected');

                    // Set up data handler
                    this.port.on('data', (data: Buffer) => {
                        this.handleData(data);
                    });

                    this.port.on('error', (err: Error) => {
                        console.error('Serial port error:', err.message);
                        this.emit('error', err);
                    });

                    this.port.on('close', () => {
                        console.log('Serial port closed');
                        this.connected = false;
                        this.emit('disconnected');
                    });

                    resolve(true);
                });
            });
        } catch (error: any) {
            console.error('SerialPort module not available:', error.message);
            throw new Error('Serial port communication not available. Please install serialport package.');
        }
    }

    /**
     * Disconnect from serial port
     */
    async disconnect(): Promise<void> {
        if (this.port && this.connected) {
            return new Promise((resolve) => {
                this.port.close(() => {
                    this.port = null;
                    this.connected = false;
                    resolve();
                });
            });
        }
    }

    /**
     * Send command to device via RS485
     */
    async sendCommand(command: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (!this.port || !this.connected) {
                reject(new Error('Not connected to serial port'));
                return;
            }

            // Format command with RS485 address
            const formattedCommand = this.formatCommand(command);

            this.port.write(formattedCommand, (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Wait for response
                const timeout = setTimeout(() => {
                    reject(new Error('Command timeout'));
                }, 5000);

                this.once('response', (data: Buffer) => {
                    clearTimeout(timeout);
                    resolve(data);
                });
            });
        });
    }

    /**
     * Get attendance logs via serial
     */
    async getAttendanceLogs(): Promise<SerialAttendanceLog[]> {
        try {
            const response = await this.sendCommand('GETLOGS');
            return this.parseAttendanceLogs(response);
        } catch (error) {
            console.error('Error getting attendance logs:', error);
            return [];
        }
    }

    /**
     * Get user list via serial
     */
    async getUserList(): Promise<SerialUser[]> {
        try {
            const response = await this.sendCommand('GETUSERS');
            return this.parseUserList(response);
        } catch (error) {
            console.error('Error getting user list:', error);
            return [];
        }
    }

    /**
     * Format command for RS485 transmission
     */
    private formatCommand(command: string): Buffer {
        // RS485 frame format: [Address][Command][Checksum]
        const frame = Buffer.alloc(command.length + 3);
        frame.writeUInt8(parseInt(this.rs485Address), 0);
        frame.write(command, 1);
        frame.writeUInt8(this.calculateChecksum(command), command.length + 1);
        frame.writeUInt8(0x0D, command.length + 2); // CR terminator
        return frame;
    }

    /**
     * Calculate checksum
     */
    private calculateChecksum(data: string): number {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data.charCodeAt(i);
        }
        return sum & 0xFF;
    }

    /**
     * Handle incoming data
     */
    private handleData(data: Buffer): void {
        this.buffer = Buffer.concat([this.buffer, data]);

        // Check for complete message (ends with CR)
        const crIndex = this.buffer.indexOf(0x0D);
        if (crIndex !== -1) {
            const message = this.buffer.slice(0, crIndex);
            this.buffer = this.buffer.slice(crIndex + 1);
            this.emit('response', message);
        }
    }

    /**
     * Parse attendance logs from response
     */
    private parseAttendanceLogs(data: Buffer): SerialAttendanceLog[] {
        const logs: SerialAttendanceLog[] = [];
        const lines = data.toString().split('\n');

        for (const line of lines) {
            const parts = line.trim().split(',');
            if (parts.length >= 3) {
                logs.push({
                    biometric_user_id: parts[0],
                    timestamp: new Date(parts[1]),
                    event_type: this.parseEventType(parts[2]),
                });
            }
        }

        return logs;
    }

    /**
     * Parse user list from response
     */
    private parseUserList(data: Buffer): SerialUser[] {
        const users: SerialUser[] = [];
        const lines = data.toString().split('\n');

        for (const line of lines) {
            const parts = line.trim().split(',');
            if (parts.length >= 2) {
                users.push({
                    user_id: parts[0],
                    name: parts[1],
                });
            }
        }

        return users;
    }

    /**
     * Parse event type code
     */
    private parseEventType(code: string): 'fingerprint' | 'face' | 'card' {
        switch (code) {
            case '1': return 'fingerprint';
            case '2': return 'face';
            case '3': return 'card';
            default: return 'fingerprint';
        }
    }

    /**
     * Get available serial ports
     */
    static async getAvailablePorts(): Promise<PortInfo[]> {
        try {
            const { SerialPort } = await import('serialport');
            const ports = await SerialPort.list();
            return ports.map(p => ({
                path: p.path,
                manufacturer: p.manufacturer,
                vendorId: p.vendorId,
                productId: p.productId,
            }));
        } catch (error) {
            console.error('Error listing serial ports:', error);
            return [];
        }
    }
}

/**
 * Attendance log from serial device
 */
export interface SerialAttendanceLog {
    biometric_user_id: string;
    timestamp: Date;
    event_type: 'fingerprint' | 'face' | 'card';
}

/**
 * User from serial device
 */
export interface SerialUser {
    user_id: string;
    name: string;
}

/**
 * Serial port info
 */
export interface PortInfo {
    path: string;
    manufacturer?: string;
    vendorId?: string;
    productId?: string;
}

/**
 * Create a serial client for a device
 */
export function createSerialClient(
    portPath?: string,
    baudRate?: number,
    rs485Address?: string
): SerialDeviceClient {
    return new SerialDeviceClient(portPath, baudRate, rs485Address);
}
