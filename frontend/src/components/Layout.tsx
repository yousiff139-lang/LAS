import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Calendar,
    ClipboardCheck,
    Cpu,
    Fingerprint,
    LogOut
} from 'lucide-react';
import { authApi, Admin } from '../services/api';
import './Layout.css';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/subjects', icon: BookOpen, label: 'Subjects' },
    { path: '/lectures', icon: Calendar, label: 'Lectures' },
    { path: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
    { path: '/devices', icon: Cpu, label: 'Devices' },
];

function Layout() {
    const navigate = useNavigate();

    // Get admin info from localStorage
    const adminStr = localStorage.getItem('admin');
    const admin: Admin | null = adminStr ? JSON.parse(adminStr) : null;

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin');
            navigate('/login');
        }
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Fingerprint className="logo-icon" />
                    <div className="logo-text">
                        <span className="logo-title">Attendance</span>
                        <span className="logo-subtitle">Management</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {admin && (
                        <div className="admin-info">
                            <div className="admin-avatar">
                                {admin.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="admin-details">
                                <span className="admin-name">{admin.full_name}</span>
                                <span className="admin-role">Administrator</span>
                            </div>
                        </div>
                    )}
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;

