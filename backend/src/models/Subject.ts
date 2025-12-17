import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { AttendanceRecord } from './AttendanceRecord';

export enum SubjectStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export enum AcademicStage {
    STAGE_1 = 'stage_1',
    STAGE_2 = 'stage_2',
    STAGE_3 = 'stage_3',
    STAGE_4 = 'stage_4',
    STAGE_5 = 'stage_5',
    POSTGRADUATE = 'postgraduate',
}

@Entity('subjects')
export class Subject {
    @PrimaryGeneratedColumn('uuid')
    subject_id!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    subject_code!: string;

    @Column({ type: 'varchar', length: 255 })
    subject_name!: string;

    @Column({ type: 'int', nullable: true })
    day_of_week?: number; // 0 = Sunday, 6 = Saturday

    @Column({ type: 'date', nullable: true })
    specific_date?: Date;

    @Column({ type: 'time' })
    start_time!: string;

    @Column({ type: 'time' })
    end_time!: string;

    @Column({
        type: 'enum',
        enum: AcademicStage,
        default: AcademicStage.STAGE_1,
    })
    academic_stage!: AcademicStage;

    @Column({
        type: 'enum',
        enum: SubjectStatus,
        default: SubjectStatus.ACTIVE,
    })
    status!: SubjectStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    location?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    instructor_name?: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    // Relations
    @OneToMany(() => AttendanceRecord, (record) => record.subject)
    attendance_records?: AttendanceRecord[];
}
