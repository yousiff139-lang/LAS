import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { BiometricTemplate } from './BiometricTemplate';
import { AttendanceRecord } from './AttendanceRecord';

export enum StudentStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

export enum AcademicStage {
    STAGE_1 = 'stage_1',
    STAGE_2 = 'stage_2',
    STAGE_3 = 'stage_3',
    STAGE_4 = 'stage_4',
    STAGE_5 = 'stage_5',
    POSTGRADUATE = 'postgraduate',
}

@Entity('students')
export class Student {
    @PrimaryGeneratedColumn('uuid')
    student_id!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    biometric_user_id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email?: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    department?: string;

    @Column({
        type: 'enum',
        enum: AcademicStage,
        default: AcademicStage.STAGE_1,
    })
    academic_stage!: AcademicStage;

    @Column({
        type: 'enum',
        enum: StudentStatus,
        default: StudentStatus.ACTIVE,
    })
    status!: StudentStatus;

    @Column({ type: 'timestamp', nullable: true })
    enrollment_date?: Date;

    @Column({ type: 'text', nullable: true })
    face_encoding?: string; // JSON array of 128 floats for face recognition

    @Column({ type: 'text', nullable: true })
    face_image_url?: string; // Reference photo for admin verification

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    registration_timestamp!: Date;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    // Relations
    @OneToMany(() => BiometricTemplate, (template) => template.student)
    biometric_templates?: BiometricTemplate[];

    @OneToMany(() => AttendanceRecord, (record) => record.student)
    attendance_records?: AttendanceRecord[];
}
