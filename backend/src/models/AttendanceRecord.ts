import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Student } from './Student';
import { Lecture } from './Lecture';
import { Subject } from './Subject';
import { Device } from './Device';

export enum AttendanceStatus {
    PRESENT = 'present',
    ABSENT = 'absent',
}

export enum AttendanceSource {
    FINGERPRINT = 'fingerprint',
    SYSTEM_AUTO = 'system_auto', // For auto-marked absences
}

@Entity('attendance_records')
export class AttendanceRecord {
    @PrimaryGeneratedColumn('uuid')
    attendance_id!: string;

    @Column({ type: 'uuid' })
    student_id!: string;

    @Column({ type: 'uuid', nullable: true })
    lecture_id?: string; // Legacy support

    @Column({ type: 'uuid', nullable: true })
    subject_id?: string; // New subject reference

    @Column({ type: 'date', nullable: true })
    attendance_date?: Date;

    @Column({ type: 'timestamp' })
    scan_timestamp!: Date;

    @Column({ type: 'uuid', nullable: true })
    device_id?: string;

    @Column({
        type: 'enum',
        enum: AttendanceStatus,
        default: AttendanceStatus.PRESENT,
    })
    status!: AttendanceStatus;

    @Column({
        type: 'enum',
        enum: AttendanceSource,
        default: AttendanceSource.FINGERPRINT,
    })
    source!: AttendanceSource;

    @Column({ type: 'uuid', nullable: true })
    raw_log_id?: string;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @ManyToOne(() => Student, (student) => student.attendance_records, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'student_id' })
    student!: Student;

    @ManyToOne(() => Lecture, (lecture) => lecture.attendance_records, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'lecture_id' })
    lecture?: Lecture;

    @ManyToOne(() => Subject, (subject) => subject.attendance_records, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'subject_id' })
    subject?: Subject;

    @ManyToOne(() => Device, (device) => device.attendance_records, {
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'device_id' })
    device?: Device;
}
