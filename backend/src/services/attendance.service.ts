import { AppDataSource } from '../config/database';
import { AttendanceRecord, AttendanceStatus, AttendanceSource, DeviceLogRaw, Student, Lecture, Subject, AcademicStage, AuditAction } from '../models';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { studentService } from './student.service';
import { lectureService } from './lecture.service';
import { subjectService } from './subject.service';
import { deviceService } from './device.service';
import { auditService } from './audit.service';

const attendanceRepository = AppDataSource.getRepository(AttendanceRecord);
const deviceLogRepository = AppDataSource.getRepository(DeviceLogRaw);

export interface ProcessScanDto {
    biometric_user_id: string;
    timestamp: Date | string;
    device_id?: string;
    event_type?: 'fingerprint' | 'face' | 'card';
}

export interface AttendanceFilters {
    lecture_id?: string;
    subject_id?: string;
    student_id?: string;
    date?: string;
    academic_stage?: AcademicStage;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
}

export interface AttendanceSummary {
    subject_id?: string;
    lecture_id?: string;
    subject_name?: string;
    course_name?: string;
    date: string;
    total_students: number;
    present: number;
    absent: number;
}

export const attendanceService = {
    async findAll(filters: AttendanceFilters = {}) {
        const { lecture_id, subject_id, student_id, date, academic_stage, status, page = 1, limit = 50 } = filters;

        let query = attendanceRepository.createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.student', 'student')
            .leftJoinAndSelect('attendance.lecture', 'lecture')
            .leftJoinAndSelect('attendance.subject', 'subject')
            .leftJoinAndSelect('attendance.device', 'device');

        if (lecture_id) {
            query = query.andWhere('attendance.lecture_id = :lecture_id', { lecture_id });
        }

        if (subject_id) {
            query = query.andWhere('attendance.subject_id = :subject_id', { subject_id });
        }

        if (student_id) {
            query = query.andWhere('attendance.student_id = :student_id', { student_id });
        }

        if (date) {
            query = query.andWhere('DATE(attendance.scan_timestamp) = :date', { date });
        }

        if (academic_stage) {
            query = query.andWhere('student.academic_stage = :academic_stage', { academic_stage });
        }

        if (status) {
            query = query.andWhere('attendance.status = :status', { status });
        }

        const total = await query.getCount();

        const records = await query
            .orderBy('attendance.scan_timestamp', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            records,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    async getSubjectSummary(subjectId: string, date: string): Promise<AttendanceSummary> {
        const subject = await subjectService.findById(subjectId);

        const records = await attendanceRepository.find({
            where: { subject_id: subjectId },
        });

        // Filter records for the specific date
        const dateRecords = records.filter(r =>
            r.attendance_date?.toISOString().split('T')[0] === date ||
            r.scan_timestamp.toISOString().split('T')[0] === date
        );

        const present = dateRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
        const absent = dateRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;

        return {
            subject_id: subjectId,
            subject_name: subject.subject_name,
            date,
            total_students: present + absent,
            present,
            absent,
        };
    },

    async getSummary(lectureId: string, date: string): Promise<AttendanceSummary> {
        const lecture = await lectureService.findById(lectureId);

        const records = await attendanceRepository.find({
            where: { lecture_id: lectureId },
        });

        // Filter records for the specific date
        const dateRecords = records.filter(r =>
            r.scan_timestamp.toISOString().split('T')[0] === date
        );

        const present = dateRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
        const absent = dateRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;

        return {
            lecture_id: lectureId,
            course_name: lecture.course_name,
            date,
            total_students: present + absent,
            present,
            absent,
        };
    },

    /**
     * Process a fingerprint scan - FINGERPRINT ONLY
     * Rejects face and card events
     */
    async processFingerprintScan(data: ProcessScanDto): Promise<AttendanceRecord | null> {
        const timestamp = new Date(data.timestamp);

        // 1. Store raw log first (always)
        const rawLog = await this.storeRawLog(data);

        // 2. STRICT: Only accept fingerprint events
        if (data.event_type && data.event_type !== 'fingerprint') {
            console.log(`Ignored non-fingerprint event: ${data.event_type} for user ${data.biometric_user_id}`);
            await deviceLogRepository.update(rawLog.raw_log_id, { processed: true });
            return null;
        }

        // 3. Find student by biometric ID
        const student = await studentService.findByBiometricId(data.biometric_user_id);
        if (!student) {
            console.log(`Unknown biometric user ID: ${data.biometric_user_id}`);
            return null;
        }

        // 4. Check if student is active
        if (student.status !== 'active') {
            console.log(`Student ${student.name} is not active (status: ${student.status})`);
            return null;
        }

        // 5. Find active subject at this time
        const subjects = await subjectService.findActiveAtTime(timestamp);
        if (subjects.length === 0) {
            // Fallback to lectures for backward compatibility
            const lectures = await lectureService.findActiveAtTime(timestamp);
            if (lectures.length === 0) {
                console.log(`No active subject/lecture at ${timestamp} for student ${student.name}`);
                return null;
            }
            // Process with legacy lecture logic
            return this.processLectureScan(data, student, lectures[0], rawLog, timestamp);
        }

        const subject = subjects[0]; // Use first matching subject

        // 6. STRICT: Validate scan is within subject time window
        if (!subjectService.isWithinTimeWindow(timestamp, subject)) {
            console.log(`Scan time ${timestamp} is outside subject window ${subject.start_time}-${subject.end_time}`);
            await deviceLogRepository.update(rawLog.raw_log_id, { processed: true });
            return null;
        }

        // 7. Check for duplicate scan (same student, same subject, same date)
        const dateStr = timestamp.toISOString().split('T')[0];
        const existingRecord = await attendanceRepository.findOne({
            where: {
                student_id: student.student_id,
                subject_id: subject.subject_id,
            },
        });

        // Check if existing record is for the same date
        if (existingRecord) {
            const existingDate = existingRecord.attendance_date?.toISOString().split('T')[0] ||
                existingRecord.scan_timestamp.toISOString().split('T')[0];
            if (existingDate === dateStr) {
                console.log(`Duplicate scan for student ${student.name} in subject ${subject.subject_name} on ${dateStr}`);
                await deviceLogRepository.update(rawLog.raw_log_id, { processed: true });
                return null;
            }
        }

        // 8. Create attendance record (PRESENT - scan within window)
        const attendanceRecord = attendanceRepository.create({
            student_id: student.student_id,
            subject_id: subject.subject_id,
            attendance_date: new Date(dateStr),
            scan_timestamp: timestamp,
            device_id: data.device_id,
            status: AttendanceStatus.PRESENT,
            source: AttendanceSource.FINGERPRINT,
            raw_log_id: rawLog.raw_log_id,
        });

        const saved = await attendanceRepository.save(attendanceRecord);

        // Mark raw log as processed
        await deviceLogRepository.update(rawLog.raw_log_id, { processed: true });

        // Log the attendance action
        await auditService.logAttendanceAction(
            AuditAction.ATTENDANCE_RECORDED,
            student.student_id,
            subject.subject_id,
            { status: AttendanceStatus.PRESENT, source: AttendanceSource.FINGERPRINT }
        );

        // Update device last sync time if applicable
        if (data.device_id) {
            await deviceService.updateLastSyncTime(data.device_id);
        }

        console.log(`✅ Attendance recorded: ${student.name} → ${subject.subject_name} (PRESENT)`);
        return saved;
    },

    /**
     * Legacy support for lecture-based attendance
     */
    async processLectureScan(
        data: ProcessScanDto,
        student: Student,
        lecture: Lecture,
        rawLog: DeviceLogRaw,
        timestamp: Date
    ): Promise<AttendanceRecord | null> {
        // Check for duplicate scan
        const existingRecord = await attendanceRepository.findOne({
            where: {
                student_id: student.student_id,
                lecture_id: lecture.lecture_id,
            },
        });

        if (existingRecord) {
            console.log(`Duplicate scan for student ${student.name} in lecture ${lecture.course_name}`);
            await deviceLogRepository.update(rawLog.raw_log_id, { processed: true });
            return null;
        }

        // Determine status (simplified - only PRESENT since scan is within window)
        const status = AttendanceStatus.PRESENT;

        // Create attendance record
        const attendanceRecord = attendanceRepository.create({
            student_id: student.student_id,
            lecture_id: lecture.lecture_id,
            scan_timestamp: timestamp,
            device_id: data.device_id,
            status,
            source: AttendanceSource.FINGERPRINT,
            raw_log_id: rawLog.raw_log_id,
        });

        const saved = await attendanceRepository.save(attendanceRecord);

        // Mark raw log as processed
        await deviceLogRepository.update(rawLog.raw_log_id, { processed: true });

        // Update device last sync time
        if (data.device_id) {
            await deviceService.updateLastSyncTime(data.device_id);
        }

        return saved;
    },

    /**
     * Process scan - routes to fingerprint-only processing
     */
    async processScan(data: ProcessScanDto): Promise<AttendanceRecord | null> {
        return this.processFingerprintScan(data);
    },

    async processBatchScans(scans: ProcessScanDto[]) {
        const results = [];
        for (const scan of scans) {
            try {
                const result = await this.processFingerprintScan(scan);
                results.push({ success: true, data: result });
            } catch (error: any) {
                results.push({ success: false, error: error.message, scan });
            }
        }
        return results;
    },

    async storeRawLog(data: ProcessScanDto): Promise<DeviceLogRaw> {
        const rawLog = deviceLogRepository.create({
            biometric_user_id: data.biometric_user_id,
            device_id: data.device_id,
            log_timestamp: new Date(data.timestamp),
            event_type: data.event_type as any,
            processed: false,
        });

        return deviceLogRepository.save(rawLog);
    },

    /**
     * Auto-mark absent students after subject ends
     * Called by scheduler after each subject's end time
     */
    async autoMarkAbsentForSubject(subjectId: string, date: string): Promise<{ marked_absent: number }> {
        const subject = await subjectService.findById(subjectId);

        // Get all active students for this academic stage
        const students = await studentService.findByAcademicStage(subject.academic_stage);

        // Get existing attendance records for this subject and date
        const existingRecords = await attendanceRepository.find({
            where: { subject_id: subjectId },
        });

        const recordedStudentIds = existingRecords
            .filter(r => {
                const recordDate = r.attendance_date?.toISOString().split('T')[0] ||
                    r.scan_timestamp.toISOString().split('T')[0];
                return recordDate === date;
            })
            .map(r => r.student_id);

        // Find students without records
        const absentStudents = students.filter(s => !recordedStudentIds.includes(s.student_id));

        // Create absent records
        for (const student of absentStudents) {
            const timestamp = new Date(date);
            const [startHour, startMinute] = subject.start_time.split(':').map(Number);
            timestamp.setHours(startHour, startMinute, 0, 0);

            const absentRecord = attendanceRepository.create({
                student_id: student.student_id,
                subject_id: subjectId,
                attendance_date: new Date(date),
                scan_timestamp: timestamp,
                status: AttendanceStatus.ABSENT,
                source: AttendanceSource.SYSTEM_AUTO,
            });

            await attendanceRepository.save(absentRecord);

            // Log the action
            await auditService.logAttendanceAction(
                AuditAction.ATTENDANCE_MARK_ABSENT,
                student.student_id,
                subjectId,
                { auto_marked: true }
            );
        }

        console.log(`📋 Auto-marked ${absentStudents.length} students as absent for ${subject.subject_name} on ${date}`);
        return { marked_absent: absentStudents.length };
    },

    /**
     * Legacy: Mark absent for lecture
     */
    async markAbsent(lectureId: string, date: string) {
        const lecture = await lectureService.findById(lectureId);

        // Get all students
        const { students } = await studentService.findAll({ limit: 1000 });

        // Get existing attendance records for this lecture and date
        const existingRecords = await attendanceRepository.find({
            where: { lecture_id: lectureId },
        });

        const recordedStudentIds = existingRecords
            .filter(r => r.scan_timestamp.toISOString().split('T')[0] === date)
            .map(r => r.student_id);

        // Find students without records
        const absentStudents = students.filter(s => !recordedStudentIds.includes(s.student_id));

        // Create absent records
        for (const student of absentStudents) {
            const timestamp = new Date(date);
            const [startHour, startMinute] = lecture.start_time.split(':').map(Number);
            timestamp.setHours(startHour, startMinute, 0, 0);

            const absentRecord = attendanceRepository.create({
                student_id: student.student_id,
                lecture_id: lectureId,
                scan_timestamp: timestamp,
                status: AttendanceStatus.ABSENT,
                source: AttendanceSource.SYSTEM_AUTO,
            });

            await attendanceRepository.save(absentRecord);
        }

        return { marked_absent: absentStudents.length };
    },

    /**
     * Get student attendance history
     */
    async getStudentHistory(studentId: string, startDate?: string, endDate?: string) {
        let query = attendanceRepository.createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.subject', 'subject')
            .leftJoinAndSelect('attendance.lecture', 'lecture')
            .where('attendance.student_id = :studentId', { studentId });

        if (startDate) {
            query = query.andWhere('DATE(attendance.scan_timestamp) >= :startDate', { startDate });
        }

        if (endDate) {
            query = query.andWhere('DATE(attendance.scan_timestamp) <= :endDate', { endDate });
        }

        const records = await query
            .orderBy('attendance.scan_timestamp', 'DESC')
            .getMany();

        // Calculate statistics
        const total = records.length;
        const present = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
        const absent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;

        return {
            records,
            statistics: {
                total,
                present,
                absent,
                attendance_rate: total > 0 ? (present / total * 100).toFixed(2) : '0.00',
            },
        };
    },

    /**
     * Get attendance for export
     */
    async getForExport(filters: AttendanceFilters) {
        const { subject_id, lecture_id, date, academic_stage, status } = filters;

        let query = attendanceRepository.createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.student', 'student')
            .leftJoinAndSelect('attendance.subject', 'subject')
            .leftJoinAndSelect('attendance.lecture', 'lecture');

        if (subject_id) {
            query = query.andWhere('attendance.subject_id = :subject_id', { subject_id });
        }

        if (lecture_id) {
            query = query.andWhere('attendance.lecture_id = :lecture_id', { lecture_id });
        }

        if (date) {
            query = query.andWhere('DATE(attendance.scan_timestamp) = :date', { date });
        }

        if (academic_stage) {
            query = query.andWhere('student.academic_stage = :academic_stage', { academic_stage });
        }

        if (status) {
            query = query.andWhere('attendance.status = :status', { status });
        }

        return query
            .orderBy('student.name', 'ASC')
            .addOrderBy('attendance.scan_timestamp', 'ASC')
            .getMany();
    },
};
