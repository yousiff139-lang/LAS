import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

export enum AuditAction {
    ADMIN_LOGIN = 'admin_login',
    ADMIN_LOGOUT = 'admin_logout',
    ADMIN_PASSWORD_CHANGE = 'admin_password_change',
    STUDENT_CREATE = 'student_create',
    STUDENT_UPDATE = 'student_update',
    STUDENT_DELETE = 'student_delete',
    SUBJECT_CREATE = 'subject_create',
    SUBJECT_UPDATE = 'subject_update',
    SUBJECT_DELETE = 'subject_delete',
    ATTENDANCE_RECORDED = 'attendance_recorded',
    ATTENDANCE_MARK_ABSENT = 'attendance_mark_absent',
    DEVICE_SYNC = 'device_sync',
    DEVICE_CREATE = 'device_create',
    DEVICE_UPDATE = 'device_update',
    DEVICE_DELETE = 'device_delete',
    REPORT_EXPORT = 'report_export',
    FINGERPRINT_REGISTERED = 'fingerprint_registered',
    FINGERPRINT_DELETED = 'fingerprint_deleted',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    log_id!: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action!: AuditAction;

    @Column({ type: 'uuid', nullable: true })
    admin_id?: string;

    @Column({ type: 'uuid', nullable: true })
    target_id?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    target_type?: string;

    @Column({ type: 'jsonb', nullable: true })
    details?: Record<string, any>;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ip_address?: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    user_agent?: string;

    @CreateDateColumn()
    created_at!: Date;
}
