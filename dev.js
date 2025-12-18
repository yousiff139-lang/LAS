const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const pythonCmd = isWindows ? 'python' : 'python3';

console.log('🚀 Starting Lecture Attendance System...\n');

// Start backend
const backend = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
});

console.log('📦 Backend starting on http://localhost:3000');

// Start frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
});

console.log('🎨 Frontend starting on http://localhost:5173');

// Start Python face recognition service
const faceService = spawn(pythonCmd, ['app.py'], {
    cwd: path.join(__dirname, 'face-service'),
    stdio: 'inherit',
    shell: true
});

console.log('👤 Face Recognition Service starting on http://localhost:5000\n');

// Handle process termination
process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    faceService.kill();
    process.exit();
});

backend.on('error', (err) => {
    console.error('Backend error:', err);
});

frontend.on('error', (err) => {
    console.error('Frontend error:', err);
});

faceService.on('error', (err) => {
    console.error('Face Service error:', err);
    console.log('⚠️  Face recognition may not work. Run: cd face-service && pip install -r requirements.txt');
});
