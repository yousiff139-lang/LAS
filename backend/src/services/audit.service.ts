import { AppDataSource } from '../config/database';
import { AuditLog, AuditAction } from '../models';

const auditRepository = AppDataSource.getRepository(AuditLog);

export interface AuditLogDto {
    action: AuditAction;
    admin_id?: string;
    target_id?: string;
    target_type?: string;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
}

export const auditService = {
    /**
     * Create an audit log entry
     */
    async log(data: AuditLogDto): Promise<AuditLog> {
        const logEntry = auditRepository.create({
            action: data.action,
            admin_id: data.admin_id,
            target_id: data.target_id,
            target_type: data.target_type,
            details: data.details,
            ip_address: data.ip_address,
            user_agent: data.user_agent,
        });

        return auditRepository.save(logEntry);
    },

    /**
     * Log admin login
     */
    async logAdminLogin(adminId: string, ipAddress?: string, userAgent?: string): Promise<void> {
        await this.log({
            action: AuditAction.ADMIN_LOGIN,
            admin_id: adminId,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    },

    /**
     * Log admin logout
     */
    async logAdminLogout(adminId: string, ipAddress?: string): Promise<void> {
        await this.log({
            action: AuditAction.ADMIN_LOGOUT,
            admin_id: adminId,
            ip_address: ipAddress,
        });
    },

    /**
     * Log student-related actions
     */
    async logStudentAction(
        action: AuditAction.STUDENT_CREATE | AuditAction.STUDENT_UPDATE | AuditAction.STUDENT_DELETE,
        adminId: string,
        studentId: string,
        details?: Record<string, any>,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            action,
            admin_id: adminId,
            target_id: studentId,
            target_type: 'student',
            details,
            ip_address: ipAddress,
        });
    },

    /**
     * Log subject-related actions
     */
    async logSubjectAction(
        action: AuditAction.SUBJECT_CREATE | AuditAction.SUBJECT_UPDATE | AuditAction.SUBJECT_DELETE,
        adminId: string,
        subjectId: string,
        details?: Record<string, any>,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            action,
            admin_id: adminId,
            target_id: subjectId,
            target_type: 'subject',
            details,
            ip_address: ipAddress,
        });
    },

    /**
     * Log attendance actions
     */
    async logAttendanceAction(
        action: AuditAction.ATTENDANCE_RECORDED | AuditAction.ATTENDANCE_MARK_ABSENT,
        studentId: string,
        subjectId: string,
        details?: Record<string, any>
    ): Promise<void> {
        await this.log({
            action,
            target_id: studentId,
            target_type: 'attendance',
            details: {
                ...details,
                subject_id: subjectId,
            },
        });
    },

    /**
     * Log report exports
     */
    async logReportExport(
        adminId: string,
        reportType: string,
        details?: Record<string, any>,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            action: AuditAction.REPORT_EXPORT,
            admin_id: adminId,
            target_type: reportType,
            details,
            ip_address: ipAddress,
        });
    },

    /**
     * Find audit logs with filters
     */
    async findAll(filters: {
        action?: AuditAction;
        admin_id?: string;
        target_id?: string;
        target_type?: string;
        from_date?: Date;
        to_date?: Date;
        page?: number;
        limit?: number;
    } = {}) {
        const { page = 1, limit = 50 } = filters;

        let query = auditRepository.createQueryBuilder('log');

        if (filters.action) {
            query = query.andWhere('log.action = :action', { action: filters.action });
        }

        if (filters.admin_id) {
            query = query.andWhere('log.admin_id = :admin_id', { admin_id: filters.admin_id });
        }

        if (filters.target_id) {
            query = query.andWhere('log.target_id = :target_id', { target_id: filters.target_id });
        }

        if (filters.target_type) {
            query = query.andWhere('log.target_type = :target_type', { target_type: filters.target_type });
        }

        if (filters.from_date) {
            query = query.andWhere('log.created_at >= :from_date', { from_date: filters.from_date });
        }

        if (filters.to_date) {
            query = query.andWhere('log.created_at <= :to_date', { to_date: filters.to_date });
        }

        const total = await query.getCount();

        const logs = await query
            .orderBy('log.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
};
