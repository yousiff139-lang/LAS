import { AppDataSource } from '../config/database';
import { Lecture } from '../models';
import { AppError } from '../middleware/errorHandler';

const lectureRepository = AppDataSource.getRepository(Lecture);

export interface CreateLectureDto {
    course_name: string;
    lecturer_name?: string;
    day_of_week?: number;
    specific_date?: Date | string;
    start_time: string;
    end_time: string;
    location?: string;
}

export interface UpdateLectureDto extends Partial<CreateLectureDto> { }

export interface LectureFilters {
    course_name?: string;
    lecturer_name?: string;
    day_of_week?: number;
    date?: string;
    page?: number;
    limit?: number;
}

export const lectureService = {
    async findAll(filters: LectureFilters = {}) {
        const { course_name, lecturer_name, day_of_week, date, page = 1, limit = 50 } = filters;

        let query = lectureRepository.createQueryBuilder('lecture');

        if (course_name) {
            query = query.andWhere('lecture.course_name ILIKE :course_name', { course_name: `%${course_name}%` });
        }

        if (lecturer_name) {
            query = query.andWhere('lecture.lecturer_name ILIKE :lecturer_name', { lecturer_name: `%${lecturer_name}%` });
        }

        if (day_of_week !== undefined) {
            query = query.andWhere('lecture.day_of_week = :day_of_week', { day_of_week });
        }

        if (date) {
            query = query.andWhere('lecture.specific_date = :date', { date });
        }

        const total = await query.getCount();

        const lectures = await query
            .orderBy('lecture.start_time', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            lectures,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    async findById(lectureId: string) {
        const lecture = await lectureRepository.findOne({
            where: { lecture_id: lectureId },
            relations: ['attendance_records'],
        });

        if (!lecture) {
            throw new AppError('Lecture not found', 404);
        }

        return lecture;
    },

    async findToday() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const dateStr = today.toISOString().split('T')[0];

        return lectureRepository.createQueryBuilder('lecture')
            .where('lecture.day_of_week = :dayOfWeek', { dayOfWeek })
            .orWhere('lecture.specific_date = :dateStr', { dateStr })
            .orderBy('lecture.start_time', 'ASC')
            .getMany();
    },

    async findActiveAtTime(timestamp: Date) {
        const dayOfWeek = timestamp.getDay();
        const dateStr = timestamp.toISOString().split('T')[0];
        const timeStr = timestamp.toTimeString().slice(0, 8);

        // Find lectures where the timestamp falls within their schedule
        return lectureRepository.createQueryBuilder('lecture')
            .where('(lecture.day_of_week = :dayOfWeek OR lecture.specific_date = :dateStr)', { dayOfWeek, dateStr })
            .andWhere('lecture.start_time <= :timeStr', { timeStr })
            .andWhere('lecture.end_time >= :timeStr', { timeStr })
            .getMany();
    },

    async create(data: CreateLectureDto) {
        const lecture = lectureRepository.create(data);
        return lectureRepository.save(lecture);
    },

    async createMany(lectures: CreateLectureDto[]) {
        const created = lectureRepository.create(lectures);
        return lectureRepository.save(created);
    },

    async update(lectureId: string, data: UpdateLectureDto) {
        const lecture = await this.findById(lectureId);
        Object.assign(lecture, data);
        return lectureRepository.save(lecture);
    },

    async delete(lectureId: string) {
        const lecture = await this.findById(lectureId);
        await lectureRepository.remove(lecture);
        return { message: 'Lecture deleted successfully' };
    },
};
