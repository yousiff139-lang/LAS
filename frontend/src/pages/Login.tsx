import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import './Pages.css';

function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [setupMode, setSetupMode] = useState(false);
    const [setupData, setSetupData] = useState({
        username: '',
        full_name: '',
        email: '',
    });

    useEffect(() => {
        // Check if already logged in
        const token = localStorage.getItem('auth_token');
        if (token) {
            navigate('/');
            return;
        }

        // Check if setup is required
        checkSetup();
    }, [navigate]);

    const checkSetup = async () => {
        try {
            const result = await authApi.checkSetup();
            if (result.setup_required) {
                setSetupMode(true);
            }
        } catch (err) {
            console.error('Failed to check setup:', err);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await authApi.login(email);
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('admin', JSON.stringify(result.admin));
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!setupData.email) {
            setError('Email is required');
            return;
        }

        setLoading(true);

        try {
            await authApi.setup({
                username: setupData.username || setupData.email.split('@')[0],
                full_name: setupData.full_name,
                email: setupData.email,
            });
            setSetupMode(false);
            setEmail(setupData.email);
            setError('');
            alert('Admin account created! Please login with your email.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon">🔐</div>
                    <h1>Attendance System</h1>
                    <p>{setupMode ? 'Initial Setup' : 'Admin Access'}</p>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {setupMode ? (
                    <form onSubmit={handleSetup} className="login-form">
                        <div className="form-group">
                            <label htmlFor="setup-name">Full Name</label>
                            <input
                                id="setup-name"
                                type="text"
                                value={setupData.full_name}
                                onChange={(e) => setSetupData({ ...setupData, full_name: e.target.value })}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="setup-email">Email</label>
                            <input
                                id="setup-email"
                                type="email"
                                value={setupData.email}
                                onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Admin Account'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}

                <div className="login-footer">
                    <p>Fingerprint-Based Attendance System</p>
                    <small>FingerTec Face ID 2 Integration</small>
                </div>
            </div>
        </div>
    );
}

export default Login;
