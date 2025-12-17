const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

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

console.log('🎨 Frontend starting on http://localhost:5173\n');

// Handle process termination
process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
});

backend.on('error', (err) => {
    console.error('Backend error:', err);
});

frontend.on('error', (err) => {
    console.error('Frontend error:', err);
});
