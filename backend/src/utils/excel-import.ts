import * as XLSX from 'xlsx';
import { CreateLectureDto } from '../services/lecture.service';

const DAY_MAP: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sun': 0,
    'mon': 1,
    'tue': 2,
    'wed': 3,
    'thu': 4,
    'fri': 5,
    'sat': 6,
};

export const excelImportService = {
    /**
     * Parse lecture schedule from Excel buffer
     * Expected columns: course_name, lecturer_name, day_of_week (or specific_date), start_time, end_time, location
     */
    async parseLectureSchedule(buffer: Buffer): Promise<CreateLectureDto[]> {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (rows.length < 2) {
            throw new Error('Excel file must have at least a header row and one data row');
        }

        // Get headers (first row)
        const headers = rows[0].map((h: string) => String(h).toLowerCase().trim());

        // Map column indices
        const colMap = {
            course_name: headers.findIndex(h => h.includes('course') || h.includes('subject')),
            lecturer_name: headers.findIndex(h => h.includes('lecturer') || h.includes('teacher') || h.includes('instructor')),
            day_of_week: headers.findIndex(h => h.includes('day')),
            specific_date: headers.findIndex(h => h.includes('date')),
            start_time: headers.findIndex(h => h.includes('start')),
            end_time: headers.findIndex(h => h.includes('end')),
            location: headers.findIndex(h => h.includes('location') || h.includes('room')),
        };

        // Validate required columns
        if (colMap.course_name === -1) {
            throw new Error('Missing required column: course_name or subject');
        }
        if (colMap.start_time === -1) {
            throw new Error('Missing required column: start_time');
        }
        if (colMap.end_time === -1) {
            throw new Error('Missing required column: end_time');
        }

        const lectures: CreateLectureDto[] = [];

        // Process data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];

            if (!row || row.length === 0) continue;

            const courseName = row[colMap.course_name];
            if (!courseName) continue;

            const lecture: CreateLectureDto = {
                course_name: String(courseName).trim(),
                start_time: this.parseTime(row[colMap.start_time]),
                end_time: this.parseTime(row[colMap.end_time]),
            };

            if (colMap.lecturer_name !== -1 && row[colMap.lecturer_name]) {
                lecture.lecturer_name = String(row[colMap.lecturer_name]).trim();
            }

            if (colMap.day_of_week !== -1 && row[colMap.day_of_week]) {
                const dayStr = String(row[colMap.day_of_week]).toLowerCase().trim();
                lecture.day_of_week = DAY_MAP[dayStr] ?? parseInt(dayStr);
            }

            if (colMap.specific_date !== -1 && row[colMap.specific_date]) {
                lecture.specific_date = this.parseDate(row[colMap.specific_date]);
            }

            if (colMap.location !== -1 && row[colMap.location]) {
                lecture.location = String(row[colMap.location]).trim();
            }

            lectures.push(lecture);
        }

        return lectures;
    },

    parseTime(value: any): string {
        if (!value) return '00:00:00';

        // If it's a number (Excel serial time), convert it
        if (typeof value === 'number') {
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        }

        // If it's a string, try to parse it
        const str = String(value).trim();
        const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);

        if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = match[3] ? parseInt(match[3]) : 0;
            const period = match[4];

            if (period) {
                if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        return str;
    },

    parseDate(value: any): string {
        if (!value) return '';

        // If it's a number (Excel serial date), convert it
        if (typeof value === 'number') {
            const date = new Date((value - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }

        // If it's already a Date object
        if (value instanceof Date) {
            return value.toISOString().split('T')[0];
        }

        // Try to parse string date
        const date = new Date(String(value));
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        return String(value);
    },
};
