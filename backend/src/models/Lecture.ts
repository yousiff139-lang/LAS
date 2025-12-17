import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { AttendanceRecord } from './AttendanceRecord';

@Entity('lectures')
export class Lecture {
    @PrimaryGeneratedColumn('uuid')
    lecture_id!: string;

    @Column({ type: 'varchar', length: 255 })
    course_name!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    lecturer_name?: string;

    @Column({ type: 'int', nullable: true })
    day_of_week?: number; // 0 = Sunday, 6 = Saturday

    @Column({ type: 'date', nullable: true })
    specific_date?: Date;

    @Column({ type: 'time' })
    start_time!: string;

    @Column({ type: 'time' })
    end_time!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    location?: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    // Relations
    @OneToMany(() => AttendanceRecord, (record) => record.lecture)
    attendance_records?: AttendanceRecord[];
}
