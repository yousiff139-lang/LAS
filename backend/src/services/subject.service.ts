import { AppDataSource } from '../config/database';
import { Subject, SubjectStatus, AcademicStage, AuditAction } from '../models';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './audit.service';

const subjectRepository = AppDataSource.getRepository(Subject);

export interface CreateSubjectDto {
    subject_code: string;
    subject_name: string;
    day_of_week?: number;
    specific_date?: Date | string;
    start_time: string;
    end_time: string;
    academic_stage?: AcademicStage;
    status?: SubjectStatus;
    location?: string;
    instructor_name?: string;
}

export interface UpdateSubjectDto {
    subject_code?: string;
    subject_name?: string;
    day_of_week?: number;
    specific_date?: Date | string;
    start_time?: string;
    end_time?: string;
    academic_stage?: AcademicStage;
    status?: SubjectStatus;
    location?: string;
    instructor_name?: string;
}

export interface SubjectFilters {
    status?: SubjectStatus;
    academic_stage?: AcademicStage;
    day_of_week?: number;
    page?: number;
    limit?: number;
}

export const subjectService = {
    /**
     * Find all subjects with filters
     */
    async findAll(filters: SubjectFilters = {}) {
        const { page = 1, limit = 50, status, academic_stage, day_of_week } = filters;

        let query = subjectRepository.createQueryBuilder('subject');

        if (status) {
            query = query.andWhere('subject.status = :status', { status });
        }

        if (academic_stage) {
            query = query.andWhere('subject.academic_stage = :academic_stage', { academic_stage });
        }

        if (day_of_week !== undefined) {
            query = query.andWhere('subject.day_of_week = :day_of_week', { day_of_week });
        }

        const total = await query.getCount();

        const subjects = await query
            .orderBy('subject.start_time', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            subjects,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Find subject by ID
     */
    async findById(subjectId: string): Promise<Subject> {
        const subject = await subjectRepository.findOne({
            where: { subject_id: subjectId },
        });

        if (!subject) {
            throw new AppError('Subject not found', 404);
        }

        return subject;
    },

    /**
     * Find subject by code
     */
    async findByCode(subjectCode: string): Promise<Subject | null> {
        return subjectRepository.findOne({
            where: { subject_code: subjectCode },
        });
    },

    /**
     * Find active subjects for today
     */
    async findActiveToday(): Promise<Subject[]> {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const todayDate = today.toISOString().split('T')[0];

        return subjectRepository
            .createQueryBuilder('subject')
            .where('subject.status = :status', { status: SubjectStatus.ACTIVE })
            .andWhere(
                '(subject.day_of_week = :dayOfWeek OR subject.specific_date = :todayDate)',
                { dayOfWeek, todayDate }
            )
            .orderBy('subject.start_time', 'ASC')
            .getMany();
    },

    /**
     * Find active subject at a specific time
     */
    async findActiveAtTime(timestamp: Date): Promise<Subject[]> {
        const dayOfWeek = timestamp.getDay();
        const dateStr = timestamp.toISOString().split('T')[0];
        const timeStr = timestamp.toTimeString().slice(0, 8); // HH:MM:SS

        return subjectRepository
            .createQueryBuilder('subject')
            .where('subject.status = :status', { status: SubjectStatus.ACTIVE })
            .andWhere(
                '(subject.day_of_week = :dayOfWeek OR subject.specific_date = :dateStr)',
                { dayOfWeek, dateStr }
            )
            .andWhere('subject.start_time <= :timeStr', { timeStr })
            .andWhere('subject.end_time >= :timeStr', { timeStr })
            .getMany();
    },

    /**
     * Find subjects by academic stage
     */
    async findByAcademicStage(stage: AcademicStage): Promise<Subject[]> {
        return subjectRepository.find({
            where: {
                academic_stage: stage,
                status: SubjectStatus.ACTIVE,
            },
            order: { start_time: 'ASC' },
        });
    },

    /**
     * Create a new subject
     */
    async create(
        data: CreateSubjectDto,
        adminId?: string,
        ipAddress?: string
    ): Promise<Subject> {
        // Check for duplicate code
        const existing = await this.findByCode(data.subject_code);
        if (existing) {
            throw new AppError('Subject code already exists', 409);
        }

        // Validate time format
        this.validateTimeFormat(data.start_time);
        this.validateTimeFormat(data.end_time);

        // Validate time range
        if (data.start_time >= data.end_time) {
            throw new AppError('Start time must be before end time', 400);
        }

        const subject = subjectRepository.create({
            subject_code: data.subject_code,
            subject_name: data.subject_name,
            day_of_week: data.day_of_week,
            specific_date: data.specific_date ? new Date(data.specific_date) : undefined,
            start_time: data.start_time,
            end_time: data.end_time,
            academic_stage: data.academic_stage || AcademicStage.STAGE_1,
            status: data.status || SubjectStatus.ACTIVE,
            location: data.location,
            instructor_name: data.instructor_name,
        });

        const saved = await subjectRepository.save(subject);

        // Log the action
        if (adminId) {
            await auditService.logSubjectAction(
                AuditAction.SUBJECT_CREATE,
                adminId,
                saved.subject_id,
                { subject_code: data.subject_code, subject_name: data.subject_name },
                ipAddress
            );
        }

        return saved;
    },

    /**
     * Update a subject
     */
    async update(
        subjectId: string,
        data: UpdateSubjectDto,
        adminId?: string,
        ipAddress?: string
    ): Promise<Subject> {
        const subject = await this.findById(subjectId);

        // Check for duplicate code if changing
        if (data.subject_code && data.subject_code !== subject.subject_code) {
            const existing = await this.findByCode(data.subject_code);
            if (existing) {
                throw new AppError('Subject code already exists', 409);
            }
        }

        // Validate times if provided
        const startTime = data.start_time || subject.start_time;
        const endTime = data.end_time || subject.end_time;

        if (data.start_time) this.validateTimeFormat(data.start_time);
        if (data.end_time) this.validateTimeFormat(data.end_time);

        if (startTime >= endTime) {
            throw new AppError('Start time must be before end time', 400);
        }

        // Update fields
        Object.assign(subject, {
            ...data,
            specific_date: data.specific_date ? new Date(data.specific_date) : subject.specific_date,
        });

        const updated = await subjectRepository.save(subject);

        // Log the action
        if (adminId) {
            await auditService.logSubjectAction(
                AuditAction.SUBJECT_UPDATE,
                adminId,
                subjectId,
                data,
                ipAddress
            );
        }

        return updated;
    },

    /**
     * Delete a subject
     */
    async delete(
        subjectId: string,
        adminId?: string,
        ipAddress?: string
    ): Promise<void> {
        const subject = await this.findById(subjectId);

        await subjectRepository.remove(subject);

        // Log the action
        if (adminId) {
            await auditService.logSubjectAction(
                AuditAction.SUBJECT_DELETE,
                adminId,
                subjectId,
                { subject_code: subject.subject_code, subject_name: subject.subject_name },
                ipAddress
            );
        }
    },

    /**
     * Toggle subject status
     */
    async toggleStatus(subjectId: string, adminId?: string, ipAddress?: string): Promise<Subject> {
        const subject = await this.findById(subjectId);

        subject.status = subject.status === SubjectStatus.ACTIVE
            ? SubjectStatus.INACTIVE
            : SubjectStatus.ACTIVE;

        const updated = await subjectRepository.save(subject);

        if (adminId) {
            await auditService.logSubjectAction(
                AuditAction.SUBJECT_UPDATE,
                adminId,
                subjectId,
                { status_changed_to: subject.status },
                ipAddress
            );
        }

        return updated;
    },

    /**
     * Validate time format (HH:MM or HH:MM:SS)
     */
    validateTimeFormat(time: string): void {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(time)) {
            throw new AppError(`Invalid time format: ${time}. Use HH:MM or HH:MM:SS`, 400);
        }
    },

    /**
     * Check if a timestamp falls within a subject's time window
     */
    isWithinTimeWindow(timestamp: Date, subject: Subject): boolean {
        const [startHour, startMin] = subject.start_time.split(':').map(Number);
        const [endHour, endMin] = subject.end_time.split(':').map(Number);

        const subjectStart = new Date(timestamp);
        subjectStart.setHours(startHour, startMin, 0, 0);

        const subjectEnd = new Date(timestamp);
        subjectEnd.setHours(endHour, endMin, 0, 0);

        return timestamp >= subjectStart && timestamp <= subjectEnd;
    },
};
