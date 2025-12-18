import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Lectures from './pages/Lectures';
import Subjects from './pages/Subjects';
import Attendance from './pages/Attendance';
import Login from './pages/Login';
import FaceRegistration from './pages/FaceRegistration';
import FaceCheckIn from './pages/FaceCheckIn';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/check-in" element={<FaceCheckIn />} />

            {/* Protected routes */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="lectures" element={<Lectures />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="face-registration" element={<FaceRegistration />} />
            </Route>

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
