import ExcelJS from 'exceljs';
import { AttendanceRecord } from '../models';

export const excelExportService = {
    async exportAttendance(records: AttendanceRecord[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Lecture Attendance System';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Attendance Records');

        // Define columns
        sheet.columns = [
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Student Name', key: 'student_name', width: 25 },
            { header: 'Student ID', key: 'biometric_user_id', width: 15 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Course', key: 'course_name', width: 30 },
            { header: 'Lecturer', key: 'lecturer_name', width: 20 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Device Location', key: 'device_location', width: 20 },
        ];

        // Style header row
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
        };
        sheet.getRow(1).alignment = { horizontal: 'center' };

        // Add data rows
        for (const record of records) {
            const date = new Date(record.scan_timestamp);

            sheet.addRow({
                date: date.toLocaleDateString(),
                time: date.toLocaleTimeString(),
                student_name: record.student?.name || 'Unknown',
                biometric_user_id: record.student?.biometric_user_id || '',
                department: record.student?.department || '',
                course_name: record.lecture?.course_name || '',
                lecturer_name: record.lecture?.lecturer_name || '',
                status: record.status.toUpperCase(),
                device_location: record.device?.location || '',
            });
        }

        // Apply conditional formatting for status
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const statusCell = row.getCell('status');
                const status = String(statusCell.value).toLowerCase();

                if (status === 'present') {
                    statusCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFC6EFCE' },
                    };
                    statusCell.font = { color: { argb: 'FF006100' } };
                } else if (status === 'late') {
                    statusCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFEB9C' },
                    };
                    statusCell.font = { color: { argb: 'FF9C5700' } };
                } else if (status === 'absent') {
                    statusCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFC7CE' },
                    };
                    statusCell.font = { color: { argb: 'FF9C0006' } };
                }
            }
        });

        // Add summary at the end
        sheet.addRow([]);

        const summary = sheet.addRow(['Summary']);
        summary.font = { bold: true };

        const presentCount = records.filter(r => r.status === 'present').length;
        const lateCount = records.filter(r => r.status === 'late').length;
        const absentCount = records.filter(r => r.status === 'absent').length;

        sheet.addRow(['Total Records', records.length]);
        sheet.addRow(['Present', presentCount]);
        sheet.addRow(['Late', lateCount]);
        sheet.addRow(['Absent', absentCount]);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    },

    async exportStudentAttendance(
        studentName: string,
        records: AttendanceRecord[]
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`Attendance - ${studentName}`);

        sheet.columns = [
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Course', key: 'course_name', width: 30 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Status', key: 'status', width: 10 },
        ];

        sheet.getRow(1).font = { bold: true };

        for (const record of records) {
            const date = new Date(record.scan_timestamp);
            sheet.addRow({
                date: date.toLocaleDateString(),
                course_name: record.lecture?.course_name || '',
                time: date.toLocaleTimeString(),
                status: record.status.toUpperCase(),
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    },
};
