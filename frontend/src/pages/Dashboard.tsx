import { useQuery } from '@tanstack/react-query';
import {
    Users,
    Calendar,
    ClipboardCheck,
    Cpu,
    TrendingUp,
    Clock,
    UserCheck,
    UserX
} from 'lucide-react';
import { studentApi, lectureApi, deviceApi, attendanceApi } from '../services/api';
import './Dashboard.css';

function Dashboard() {
    const { data: studentsData } = useQuery({
        queryKey: ['students'],
        queryFn: () => studentApi.getAll({ limit: 1 }),
    });

    const { data: lecturesData } = useQuery({
        queryKey: ['lectures'],
        queryFn: () => lectureApi.getAll({ limit: 1 }),
    });

    const { data: devicesData } = useQuery({
        queryKey: ['devices'],
        queryFn: () => deviceApi.getAll(),
    });

    const { data: todayLectures } = useQuery({
        queryKey: ['todayLectures'],
        queryFn: () => lectureApi.getToday(),
    });

    const { data: recentAttendance } = useQuery({
        queryKey: ['recentAttendance'],
        queryFn: () => attendanceApi.getAll({ limit: 10 }),
    });

    const stats = [
        {
            label: 'Total Students',
            value: studentsData?.pagination?.total || 0,
            icon: Users,
            color: 'primary',
        },
        {
            label: 'Total Lectures',
            value: lecturesData?.pagination?.total || 0,
            icon: Calendar,
            color: 'secondary',
        },
        {
            label: 'Active Devices',
            value: devicesData?.filter(d => d.is_active).length || 0,
            icon: Cpu,
            color: 'success',
        },
        {
            label: "Today's Lectures",
            value: todayLectures?.length || 0,
            icon: Clock,
            color: 'warning',
        },
    ];

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            present: 'badge badge-success',
            late: 'badge badge-warning',
            absent: 'badge badge-danger',
        };
        return classes[status] || 'badge';
    };

    return (
        <div className="dashboard">
            <header className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome to the Lecture Attendance System</p>
            </header>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className={`stat-card stat-${stat.color}`}>
                        <div className="stat-icon">
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-grid">
                <section className="card dashboard-section">
                    <h2 className="section-title">
                        <Calendar size={20} />
                        Today's Schedule
                    </h2>
                    {todayLectures && todayLectures.length > 0 ? (
                        <div className="schedule-list">
                            {todayLectures.map((lecture) => (
                                <div key={lecture.lecture_id} className="schedule-item">
                                    <div className="schedule-time">
                                        {lecture.start_time.slice(0, 5)} - {lecture.end_time.slice(0, 5)}
                                    </div>
                                    <div className="schedule-details">
                                        <span className="schedule-course">{lecture.course_name}</span>
                                        <span className="schedule-lecturer">{lecture.lecturer_name || 'No lecturer assigned'}</span>
                                    </div>
                                    {lecture.location && (
                                        <span className="schedule-location">{lecture.location}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No lectures scheduled for today</p>
                        </div>
                    )}
                </section>

                <section className="card dashboard-section">
                    <h2 className="section-title">
                        <ClipboardCheck size={20} />
                        Recent Attendance
                    </h2>
                    {recentAttendance?.records && recentAttendance.records.length > 0 ? (
                        <div className="attendance-list">
                            {recentAttendance.records.slice(0, 5).map((record) => (
                                <div key={record.attendance_id} className="attendance-item">
                                    <div className="attendance-info">
                                        <span className="attendance-student">{record.student?.name || 'Unknown'}</span>
                                        <span className="attendance-course">{record.lecture?.course_name || 'Unknown'}</span>
                                    </div>
                                    <div className="attendance-meta">
                                        <span className={getStatusBadge(record.status)}>{record.status}</span>
                                        <span className="attendance-time">
                                            {new Date(record.scan_timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No recent attendance records</p>
                        </div>
                    )}
                </section>

                <section className="card dashboard-section full-width">
                    <h2 className="section-title">
                        <Cpu size={20} />
                        Device Status
                    </h2>
                    {devicesData && devicesData.length > 0 ? (
                        <div className="devices-grid">
                            {devicesData.slice(0, 4).map((device) => (
                                <div key={device.device_id} className="device-card">
                                    <div className="device-header">
                                        <span className="device-id">{device.biometric_device_id}</span>
                                        <span className={`device-status ${device.is_active ? 'active' : 'inactive'}`}>
                                            {device.is_active ? '● Active' : '○ Inactive'}
                                        </span>
                                    </div>
                                    <div className="device-info">
                                        <p>{device.location || 'No location'}</p>
                                        {device.ip_address && <p className="device-ip">IP: {device.ip_address}</p>}
                                        {device.last_sync_time && (
                                            <p className="device-sync">
                                                Last sync: {new Date(device.last_sync_time).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="device-modes">
                                        {device.ip_address && <span className="mode-badge">TCP/IP</span>}
                                        {device.rs485_address && <span className="mode-badge">RS485</span>}
                                        {device.usb_enabled && <span className="mode-badge">USB</span>}
                                        {device.aosp_connection_enabled && <span className="mode-badge">AOSP</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No devices configured</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
