import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Student } from './Student';

export enum TemplateType {
    FINGERPRINT = 'fingerprint',
    FACE = 'face',
    CARD = 'card',
}

@Entity('biometric_templates')
export class BiometricTemplate {
    @PrimaryGeneratedColumn('uuid')
    template_id!: string;

    @Column({ type: 'uuid' })
    student_id!: string;

    @Column({
        type: 'enum',
        enum: TemplateType,
    })
    template_type!: TemplateType;

    @Column({ type: 'bytea', nullable: true })
    template_data?: Buffer;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    // Relations
    @ManyToOne(() => Student, (student) => student.biometric_templates, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'student_id' })
    student!: Student;
}
