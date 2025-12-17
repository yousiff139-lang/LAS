import net from 'net';
import { EventEmitter } from 'events';
import { env } from '../config/env';

/**
 * TCP Client for FingerTec Face ID 2 Device Communication
 * Uses ZK protocol for biometric device communication
 */
export class TcpDeviceClient extends EventEmitter {
    private socket: net.Socket | null = null;
    private ipAddress: string;
    private port: number;
    private connected: boolean = false;
    private buffer: Buffer = Buffer.alloc(0);

    // ZK Protocol constants
    private static readonly CMD_CONNECT = 1000;
    private static readonly CMD_EXIT = 1001;
    private static readonly CMD_GET_TIME = 201;
    private static readonly CMD_SET_TIME = 202;
    private static readonly CMD_ATTLOG_RRQ = 13; // Request attendance logs
    private static readonly CMD_USERTEMP_RRQ = 9; // Request user list
    private static readonly CMD_CLEAR_ATTLOG = 15;
    private static readonly CMD_ACK_OK = 2000;
    private static readonly CMD_ACK_ERROR = 2001;

    private sessionId: number = 0;
    private replyId: number = 0;

    constructor(ipAddress: string, port: number = env.tcp.defaultDevicePort) {
        super();
        this.ipAddress = ipAddress;
        this.port = port;
    }

    /**
     * Connect to the device
     */
    async connect(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();

            this.socket.connect(this.port, this.ipAddress, () => {
                console.log(`Connected to device at ${this.ipAddress}:${this.port}`);
                this.sendCommand(TcpDeviceClient.CMD_CONNECT);
            });

            this.socket.on('data', (data: Buffer) => {
                this.handleData(data);
            });

            this.socket.on('error', (err: Error) => {
                console.error('TCP connection error:', err.message);
                this.connected = false;
                this.emit('error', err);
                reject(err);
            });

            this.socket.on('close', () => {
                console.log('Connection closed');
                this.connected = false;
                this.emit('disconnected');
            });

            // Wait for connection acknowledgment
            this.once('connected', () => {
                this.connected = true;
                resolve(true);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Disconnect from the device
     */
    async disconnect(): Promise<void> {
        if (this.socket && this.connected) {
            this.sendCommand(TcpDeviceClient.CMD_EXIT);
            this.socket.destroy();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * Get attendance logs from device
     */
    async getAttendanceLogs(): Promise<AttendanceLog[]> {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to device'));
                return;
            }

            const logs: AttendanceLog[] = [];

            this.once('attendance_logs', (data: AttendanceLog[]) => {
                resolve(data);
            });

            this.once('error', (err: Error) => {
                reject(err);
            });

            this.sendCommand(TcpDeviceClient.CMD_ATTLOG_RRQ);

            // Timeout after 30 seconds
            setTimeout(() => {
                resolve(logs);
            }, 30000);
        });
    }

    /**
     * Get user list from device
     */
    async getUserList(): Promise<DeviceUser[]> {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to device'));
                return;
            }

            const users: DeviceUser[] = [];

            this.once('user_list', (data: DeviceUser[]) => {
                resolve(data);
            });

            this.once('error', (err: Error) => {
                reject(err);
            });

            this.sendCommand(TcpDeviceClient.CMD_USERTEMP_RRQ);

            // Timeout after 30 seconds
            setTimeout(() => {
                resolve(users);
            }, 30000);
        });
    }

    /**
     * Get device time
     */
    async getDeviceTime(): Promise<Date> {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to device'));
                return;
            }

            this.once('device_time', (time: Date) => {
                resolve(time);
            });

            this.sendCommand(TcpDeviceClient.CMD_GET_TIME);

            setTimeout(() => {
                reject(new Error('Timeout getting device time'));
            }, 10000);
        });
    }

    /**
     * Clear attendance logs from device
     */
    async clearAttendanceLogs(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to device'));
                return;
            }

            this.once('logs_cleared', () => {
                resolve(true);
            });

            this.sendCommand(TcpDeviceClient.CMD_CLEAR_ATTLOG);

            setTimeout(() => {
                reject(new Error('Timeout clearing logs'));
            }, 10000);
        });
    }

    /**
     * Send command to device
     */
    private sendCommand(command: number, data: Buffer = Buffer.alloc(0)): void {
        if (!this.socket) return;

        const header = this.createPacket(command, data);
        this.socket.write(header);
    }

    /**
     * Create packet for ZK protocol
     */
    private createPacket(command: number, data: Buffer): Buffer {
        const header = Buffer.alloc(8 + data.length);

        // Packet header
        header.writeUInt16LE(command, 0);
        header.writeUInt16LE(0, 2); // Checksum placeholder
        header.writeUInt16LE(this.sessionId, 4);
        header.writeUInt16LE(this.replyId++, 6);

        if (data.length > 0) {
            data.copy(header, 8);
        }

        // Calculate checksum
        const checksum = this.calculateChecksum(header);
        header.writeUInt16LE(checksum, 2);

        return header;
    }

    /**
     * Calculate ZK protocol checksum
     */
    private calculateChecksum(data: Buffer): number {
        let sum = 0;
        for (let i = 0; i < data.length; i += 2) {
            if (i + 1 < data.length) {
                sum += data.readUInt16LE(i);
            } else {
                sum += data[i];
            }
        }
        sum = (sum ^ 0xFFFF) + 1;
        return sum & 0xFFFF;
    }

    /**
     * Handle incoming data from device
     */
    private handleData(data: Buffer): void {
        this.buffer = Buffer.concat([this.buffer, data]);

        while (this.buffer.length >= 8) {
            const command = this.buffer.readUInt16LE(0);

            if (command === TcpDeviceClient.CMD_ACK_OK) {
                // Connection successful
                this.sessionId = this.buffer.readUInt16LE(4);
                this.emit('connected');
            } else if (command === TcpDeviceClient.CMD_ACK_ERROR) {
                this.emit('error', new Error('Device returned error'));
            }

            // Parse different response types based on command
            // This is a simplified implementation
            // Real implementation would need to handle ZK protocol specifics

            // Clear processed data
            this.buffer = this.buffer.slice(8);
        }
    }
}

/**
 * Attendance log from device
 */
export interface AttendanceLog {
    biometric_user_id: string;
    timestamp: Date;
    event_type: 'fingerprint' | 'face' | 'card';
    status: number;
}

/**
 * User from device
 */
export interface DeviceUser {
    user_id: string;
    name: string;
    privilege: number;
    password?: string;
    card_number?: string;
}

/**
 * Create a TCP client for a device
 */
export function createTcpClient(ipAddress: string, port?: number): TcpDeviceClient {
    return new TcpDeviceClient(ipAddress, port);
}
