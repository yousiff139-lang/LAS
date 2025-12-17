import { AppDataSource } from '../config/database';
import { Student, StudentStatus, AcademicStage, AuditAction } from '../models';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './audit.service';

const studentRepository = AppDataSource.getRepository(Student);

export interface CreateStudentDto {
    biometric_user_id: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    academic_stage?: AcademicStage;
    status?: StudentStatus;
    enrollment_date?: Date;
}

export interface UpdateStudentDto extends Partial<CreateStudentDto> { }

export interface StudentFilters {
    department?: string;
    status?: StudentStatus;
    academic_stage?: AcademicStage;
    search?: string;
    page?: number;
    limit?: number;
}

export const studentService = {
    async findAll(filters: StudentFilters = {}) {
        const { department, status, academic_stage, search, page = 1, limit = 50 } = filters;

        let query = studentRepository.createQueryBuilder('student');

        if (department) {
            query = query.andWhere('student.department = :department', { department });
        }

        if (status) {
            query = query.andWhere('student.status = :status', { status });
        }

        if (academic_stage) {
            query = query.andWhere('student.academic_stage = :academic_stage', { academic_stage });
        }

        if (search) {
            query = query.andWhere(
                '(student.name ILIKE :search OR student.email ILIKE :search OR student.biometric_user_id ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        const total = await query.getCount();

        const students = await query
            .orderBy('student.name', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    async findById(studentId: string) {
        const student = await studentRepository.findOne({
            where: { student_id: studentId },
            relations: ['biometric_templates', 'attendance_records'],
        });

        if (!student) {
            throw new AppError('Student not found', 404);
        }

        return student;
    },

    async findByBiometricId(biometricUserId: string) {
        return studentRepository.findOne({
            where: { biometric_user_id: biometricUserId },
        });
    },

    /**
     * Find all active students by academic stage
     */
    async findByAcademicStage(stage: AcademicStage): Promise<Student[]> {
        return studentRepository.find({
            where: {
                academic_stage: stage,
                status: StudentStatus.ACTIVE,
            },
            order: { name: 'ASC' },
        });
    },

    /**
     * Find all active students (not suspended or inactive)
     */
    async findAllActive(): Promise<Student[]> {
        return studentRepository.find({
            where: { status: StudentStatus.ACTIVE },
            order: { name: 'ASC' },
        });
    },

    async create(data: CreateStudentDto, adminId?: string, ipAddress?: string) {
        // Check if biometric ID already exists
        const existing = await studentRepository.findOne({
            where: { biometric_user_id: data.biometric_user_id },
        });

        if (existing) {
            throw new AppError('Biometric user ID already exists', 400);
        }

        const student = studentRepository.create({
            ...data,
            academic_stage: data.academic_stage || AcademicStage.STAGE_1,
            status: data.status || StudentStatus.ACTIVE,
            enrollment_date: data.enrollment_date || new Date(),
            registration_timestamp: new Date(),
        });

        const saved = await studentRepository.save(student);

        // Log the action
        if (adminId) {
            await auditService.logStudentAction(
                AuditAction.STUDENT_CREATE,
                adminId,
                saved.student_id,
                { name: data.name, biometric_user_id: data.biometric_user_id },
                ipAddress
            );
        }

        return saved;
    },

    async update(studentId: string, data: UpdateStudentDto, adminId?: string, ipAddress?: string) {
        const student = await this.findById(studentId);

        // Check if new biometric ID conflicts with existing
        if (data.biometric_user_id && data.biometric_user_id !== student.biometric_user_id) {
            const existing = await studentRepository.findOne({
                where: { biometric_user_id: data.biometric_user_id },
            });

            if (existing) {
                throw new AppError('Biometric user ID already exists', 400);
            }
        }

        Object.assign(student, data);
        const updated = await studentRepository.save(student);

        // Log the action
        if (adminId) {
            await auditService.logStudentAction(
                AuditAction.STUDENT_UPDATE,
                adminId,
                studentId,
                data,
                ipAddress
            );
        }

        return updated;
    },

    async delete(studentId: string, adminId?: string, ipAddress?: string) {
        const student = await this.findById(studentId);

        // Log before deletion
        if (adminId) {
            await auditService.logStudentAction(
                AuditAction.STUDENT_DELETE,
                adminId,
                studentId,
                { name: student.name, biometric_user_id: student.biometric_user_id },
                ipAddress
            );
        }

        await studentRepository.remove(student);
        return { message: 'Student deleted successfully' };
    },

    /**
     * Suspend a student
     */
    async suspend(studentId: string, adminId?: string, ipAddress?: string) {
        const student = await this.findById(studentId);
        student.status = StudentStatus.SUSPENDED;
        const updated = await studentRepository.save(student);

        if (adminId) {
            await auditService.logStudentAction(
                AuditAction.STUDENT_UPDATE,
                adminId,
                studentId,
                { status_changed_to: StudentStatus.SUSPENDED },
                ipAddress
            );
        }

        return updated;
    },

    /**
     * Activate a student
     */
    async activate(studentId: string, adminId?: string, ipAddress?: string) {
        const student = await this.findById(studentId);
        student.status = StudentStatus.ACTIVE;
        const updated = await studentRepository.save(student);

        if (adminId) {
            await auditService.logStudentAction(
                AuditAction.STUDENT_UPDATE,
                adminId,
                studentId,
                { status_changed_to: StudentStatus.ACTIVE },
                ipAddress
            );
        }

        return updated;
    },

    async syncToDevice(studentId: string, deviceId: string) {
        // Placeholder for device sync logic
        const student = await this.findById(studentId);
        // In production, this would communicate with the device
        return { message: `Student ${student.name} synced to device ${deviceId}` };
    },
};

