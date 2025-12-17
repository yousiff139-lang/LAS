import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Types
export interface Admin {
    admin_id: string;
    username: string;
    full_name: string;
    email?: string;
    is_active: boolean;
    last_login?: string;
    created_at: string;
}

export interface Student {
    student_id: string;
    biometric_user_id: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    academic_stage: 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5' | 'postgraduate';
    status: 'active' | 'inactive' | 'suspended';
    registration_timestamp?: string;
    enrollment_date?: string;
    created_at: string;
    updated_at: string;
}

export interface Subject {
    subject_id: string;
    subject_code: string;
    subject_name: string;
    day_of_week?: number;
    specific_date?: string;
    start_time: string;
    end_time: string;
    academic_stage: 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5' | 'postgraduate';
    status: 'active' | 'inactive';
    location?: string;
    instructor_name?: string;
    created_at: string;
    updated_at: string;
}

export interface Lecture {
    lecture_id: string;
    course_name: string;
    lecturer_name?: string;
    day_of_week?: number;
    specific_date?: string;
    start_time: string;
    end_time: string;
    location?: string;
    created_at: string;
    updated_at: string;
}

export interface Device {
    device_id: string;
    biometric_device_id: string;
    ip_address?: string;
    rs485_address?: string;
    usb_enabled: boolean;
    aosp_connection_enabled: boolean;
    aosp_token?: string;
    location?: string;
    serial_port?: string;
    baud_rate?: number;
    last_sync_time?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AttendanceRecord {
    attendance_id: string;
    student_id: string;
    lecture_id?: string;
    subject_id?: string;
    attendance_date?: string;
    scan_timestamp: string;
    device_id?: string;
    status: 'present' | 'absent';
    source: 'fingerprint' | 'system_auto';
    raw_log_id?: string;
    created_at: string;
    student?: Student;
    lecture?: Lecture;
    subject?: Subject;
    device?: Device;
}

export interface PaginatedResponse<T> {
    success: boolean;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Auth API
export const authApi = {
    login: async (email: string) => {
        const response = await api.post<{ message: string; token: string; admin: Admin }>('/auth/login', { email });
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin');
        }
    },

    getMe: async () => {
        const response = await api.get<Admin>('/auth/me');
        return response.data;
    },

    changePassword: async (current_password: string, new_password: string) => {
        const response = await api.post('/auth/change-password', { current_password, new_password });
        return response.data;
    },

    checkSetup: async () => {
        const response = await api.get<{ setup_required: boolean }>('/auth/check-setup');
        return response.data;
    },

    setup: async (data: { username: string; full_name: string; email: string; password?: string }) => {
        const response = await api.post<{ message: string; admin: Admin }>('/auth/setup', data);
        return response.data;
    },
};

// Student API
export const studentApi = {
    getAll: async (params?: { page?: number; limit?: number; search?: string; department?: string; academic_stage?: string; status?: string }) => {
        const response = await api.get<PaginatedResponse<Student> & { students: Student[] }>('/admin/students', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<{ success: boolean; student: Student }>(`/admin/students/${id}`);
        return response.data.student;
    },

    create: async (data: Partial<Student>) => {
        const response = await api.post<{ success: boolean; student: Student }>('/admin/students', data);
        return response.data.student;
    },

    update: async (id: string, data: Partial<Student>) => {
        const response = await api.put<{ success: boolean; student: Student }>(`/admin/students/${id}`, data);
        return response.data.student;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/admin/students/${id}`);
        return response.data;
    },

    suspend: async (id: string) => {
        const response = await api.post(`/admin/students/${id}/suspend`);
        return response.data;
    },

    activate: async (id: string) => {
        const response = await api.post(`/admin/students/${id}/activate`);
        return response.data;
    },
};

// Subject API
export const subjectApi = {
    getAll: async (params?: { page?: number; limit?: number; status?: string; academic_stage?: string; day_of_week?: number }) => {
        const response = await api.get<PaginatedResponse<Subject> & { subjects: Subject[] }>('/admin/subjects', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<Subject>(`/admin/subjects/${id}`);
        return response.data;
    },

    getActiveToday: async () => {
        const response = await api.get<Subject[]>('/admin/subjects/active/today');
        return response.data;
    },

    getByStage: async (stage: string) => {
        const response = await api.get<Subject[]>(`/admin/subjects/stage/${stage}`);
        return response.data;
    },

    create: async (data: Partial<Subject>) => {
        const response = await api.post<Subject>('/admin/subjects', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Subject>) => {
        const response = await api.put<Subject>(`/admin/subjects/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/admin/subjects/${id}`);
        return response.data;
    },

    toggleStatus: async (id: string) => {
        const response = await api.post<Subject>(`/admin/subjects/${id}/toggle-status`);
        return response.data;
    },
};

// Lecture API (legacy support)
export const lectureApi = {
    getAll: async (params?: { page?: number; limit?: number; course_name?: string; day_of_week?: number }) => {
        const response = await api.get<PaginatedResponse<Lecture> & { lectures: Lecture[] }>('/admin/lectures', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<{ success: boolean; lecture: Lecture }>(`/admin/lectures/${id}`);
        return response.data.lecture;
    },

    getToday: async () => {
        const response = await api.get<{ success: boolean; lectures: Lecture[] }>('/admin/lectures/today');
        return response.data.lectures;
    },

    create: async (data: Partial<Lecture>) => {
        const response = await api.post<{ success: boolean; lecture: Lecture }>('/admin/lectures', data);
        return response.data.lecture;
    },

    update: async (id: string, data: Partial<Lecture>) => {
        const response = await api.put<{ success: boolean; lecture: Lecture }>(`/admin/lectures/${id}`, data);
        return response.data.lecture;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/admin/lectures/${id}`);
        return response.data;
    },

    import: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/admin/lectures/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

// Device API
export const deviceApi = {
    getAll: async () => {
        const response = await api.get<{ success: boolean; devices: Device[] }>('/admin/devices');
        return response.data.devices;
    },

    getById: async (id: string) => {
        const response = await api.get<{ success: boolean; device: Device }>(`/admin/devices/${id}`);
        return response.data.device;
    },

    getStatus: async (id: string) => {
        const response = await api.get(`/admin/devices/${id}/status`);
        return response.data.status;
    },

    create: async (data: Partial<Device>) => {
        const response = await api.post<{ success: boolean; device: Device }>('/admin/devices', data);
        return response.data.device;
    },

    update: async (id: string, data: Partial<Device>) => {
        const response = await api.put<{ success: boolean; device: Device }>(`/admin/devices/${id}`, data);
        return response.data.device;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/admin/devices/${id}`);
        return response.data;
    },

    regenerateToken: async (id: string) => {
        const response = await api.post(`/admin/devices/${id}/regenerate-token`);
        return response.data;
    },

    importUsb: async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/admin/devices/${id}/import-usb`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

// Attendance API
export const attendanceApi = {
    getAll: async (params?: { page?: number; limit?: number; lecture_id?: string; subject_id?: string; student_id?: string; date?: string; academic_stage?: string; status?: string }) => {
        const response = await api.get<PaginatedResponse<AttendanceRecord> & { records: AttendanceRecord[] }>('/admin/attendance', { params });
        return response.data;
    },

    getSummary: async (lectureId: string, date: string) => {
        const response = await api.get('/admin/attendance/summary', { params: { lecture_id: lectureId, date } });
        return response.data.summary;
    },

    getSubjectSummary: async (subjectId: string, date: string) => {
        const response = await api.get('/admin/attendance/summary', { params: { subject_id: subjectId, date } });
        return response.data.summary;
    },

    getStudentHistory: async (studentId: string, startDate?: string, endDate?: string) => {
        const response = await api.get(`/admin/attendance/student/${studentId}`, { params: { start_date: startDate, end_date: endDate } });
        return response.data;
    },

    export: async (params: { lecture_id?: string; subject_id?: string; date?: string; academic_stage?: string; status?: string }) => {
        const response = await api.get('/admin/attendance/export', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },

    markAbsent: async (subjectId: string, date: string) => {
        const response = await api.post('/admin/attendance/mark-absent', { subject_id: subjectId, date });
        return response.data;
    },
};

export default api;
