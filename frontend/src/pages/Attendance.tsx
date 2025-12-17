import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Filter, Calendar, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceApi, lectureApi } from '../services/api';
import './Pages.css';

function Attendance() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLecture, setSelectedLecture] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    const { data: lecturesData } = useQuery({
        queryKey: ['lectures'],
        queryFn: () => lectureApi.getAll({ limit: 100 }),
    });

    const { data: attendanceData, isLoading } = useQuery({
        queryKey: ['attendance', selectedDate, selectedLecture, selectedStatus],
        queryFn: () => attendanceApi.getAll({
            date: selectedDate || undefined,
            lecture_id: selectedLecture || undefined,
            status: selectedStatus || undefined,
            limit: 100,
        }),
    });

    const { data: summary } = useQuery({
        queryKey: ['attendanceSummary', selectedLecture, selectedDate],
        queryFn: () => attendanceApi.getSummary(selectedLecture, selectedDate),
        enabled: !!selectedLecture && !!selectedDate,
    });

    const handleExport = async () => {
        try {
            const blob = await attendanceApi.export({
                date: selectedDate || undefined,
                lecture_id: selectedLecture || undefined,
                status: selectedStatus || undefined,
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${selectedDate}_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Attendance exported successfully');
        } catch (error) {
            toast.error('Failed to export attendance');
        }
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            present: 'badge badge-success',
            late: 'badge badge-warning',
            absent: 'badge badge-danger',
        };
        return classes[status] || 'badge';
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1>Attendance</h1>
                    <p>View and export attendance records</p>
                </div>
                <button className="btn btn-success" onClick={handleExport}>
                    <Download size={18} />
                    Export to Excel
                </button>
            </header>

            <div className="filters">
                <div className="filter-group">
                    <label className="label">
                        <Calendar size={16} />
                        Date
                    </label>
                    <input
                        type="date"
                        className="input"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label className="label">
                        <Users size={16} />
                        Lecture
                    </label>
                    <select
                        className="input"
                        value={selectedLecture}
                        onChange={(e) => setSelectedLecture(e.target.value)}
                    >
                        <option value="">All Lectures</option>
                        {lecturesData?.lectures?.map((lecture) => (
                            <option key={lecture.lecture_id} value={lecture.lecture_id}>
                                {lecture.course_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="label">
                        <Filter size={16} />
                        Status
                    </label>
                    <select
                        className="input"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                    </select>
                </div>
            </div>

            {summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <span className="summary-value">{summary.total_students}</span>
                        <span className="summary-label">Total</span>
                    </div>
                    <div className="summary-card success">
                        <span className="summary-value">{summary.present}</span>
                        <span className="summary-label">Present</span>
                    </div>
                    <div className="summary-card warning">
                        <span className="summary-value">{summary.late}</span>
                        <span className="summary-label">Late</span>
                    </div>
                    <div className="summary-card danger">
                        <span className="summary-value">{summary.absent}</span>
                        <span className="summary-label">Absent</span>
                    </div>
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Biometric ID</th>
                            <th>Course</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Device</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="loading-cell">
                                    <div className="spinner"></div>
                                </td>
                            </tr>
                        ) : attendanceData?.records?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-cell">No attendance records found</td>
                            </tr>
                        ) : (
                            attendanceData?.records?.map((record) => (
                                <tr key={record.attendance_id}>
                                    <td>{record.student?.name || 'Unknown'}</td>
                                    <td><code>{record.student?.biometric_user_id || '-'}</code></td>
                                    <td>{record.lecture?.course_name || 'Unknown'}</td>
                                    <td>
                                        <div className="time-cell">
                                            <Clock size={14} />
                                            {new Date(record.scan_timestamp).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={getStatusBadge(record.status)}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td>{record.device?.location || record.device?.biometric_device_id || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Attendance;
