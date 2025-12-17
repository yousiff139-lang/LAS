import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { AttendanceRecord } from './AttendanceRecord';
import { DeviceLogRaw } from './DeviceLogRaw';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn('uuid')
    device_id!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    biometric_device_id!: string;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ip_address?: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    rs485_address?: string;

    @Column({ type: 'boolean', default: false })
    usb_enabled!: boolean;

    @Column({ type: 'boolean', default: false })
    aosp_connection_enabled!: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    aosp_token?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    location?: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    serial_port?: string; // e.g., COM1, /dev/ttyUSB0

    @Column({ type: 'int', nullable: true })
    baud_rate?: number;

    @Column({ type: 'timestamp', nullable: true })
    last_sync_time?: Date;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    // Relations
    @OneToMany(() => AttendanceRecord, (record) => record.device)
    attendance_records?: AttendanceRecord[];

    @OneToMany(() => DeviceLogRaw, (log) => log.device)
    raw_logs?: DeviceLogRaw[];
}
