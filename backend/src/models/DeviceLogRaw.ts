import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Device } from './Device';

export enum EventType {
    FINGERPRINT = 'fingerprint',
    FACE = 'face',
    CARD = 'card',
}

@Entity('device_logs_raw')
export class DeviceLogRaw {
    @PrimaryGeneratedColumn('uuid')
    raw_log_id!: string;

    @Column({ type: 'varchar', length: 50 })
    biometric_user_id!: string;

    @Column({ type: 'uuid' })
    device_id!: string;

    @Column({ type: 'timestamp' })
    log_timestamp!: Date;

    @Column({
        type: 'enum',
        enum: EventType,
        nullable: true,
    })
    event_type?: EventType;

    @Column({ type: 'boolean', default: false })
    processed!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @ManyToOne(() => Device, (device) => device.raw_logs, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'device_id' })
    device!: Device;
}
