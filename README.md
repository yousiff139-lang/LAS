# Lecture Attendance System with Facial Recognition

A complete, production-ready web-based system for managing lecture attendance using **AI-powered facial recognition** with ML-based anti-spoofing. Students can check in using their webcam (browser or mobile), and the system verifies their identity using face matching with liveness detection.

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL 15 |
| **Frontend** | React 18 + Vite + TypeScript |
| **Face Recognition** | Python + FastAPI + face_recognition + DeepFace |
| **Anti-Spoofing** | DeepFace Silent-Face (ML-based liveness detection) |
| **Export/Import** | ExcelJS / SheetJS (xlsx) |
| **Containerization** | Docker + docker-compose |

## 📋 Features

### Admin Dashboard
- 📊 Real-time statistics and today's schedule
- 👨‍🎓 **Student Management**: Add, edit, delete students
- 👤 **Face Registration**: Register student faces via webcam
- 📅 **Lecture Scheduling**: Manual entry or Excel import
- ✅ **Attendance Tracking**: View, filter, export to Excel

### Facial Recognition Check-In
- **Webcam Support**: Works on desktop browsers and mobile devices
- **ML Anti-Spoofing**: Detects and rejects printed photos, screen displays, and video replays
- **Real-time Verification**: Instant face matching with confidence scoring
- **User-Friendly**: Simple check-in flow with visual feedback
- **Secure**: Face encodings stored as encrypted 128-dimensional vectors

### Attendance Logic
- Automatic face-based attendance marking
- Status determination: Present / Late / Absent
- Configurable grace period and late threshold
- Prevents duplicate check-ins


## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+ (for face recognition service)
- PostgreSQL 15+
- Docker & Docker Compose (recommended)

### Option 1: Docker Compose (Recommended)

```bash
# Clone and navigate to project directory
cd LectureAttendance

# Create environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
# Required: DATABASE_PASSWORD, JWT_SECRET
# Optional: FACE_MATCH_THRESHOLD, ANTI_SPOOF_THRESHOLD

# Start all services (backend, frontend, face-service, database)
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Face Service: http://localhost:5000
# Student Check-in: http://localhost:5173/check-in
```

### Option 2: Manual Setup

**1. Database Setup**
```bash
# Create PostgreSQL database
createdb lecture_attendance
```

**2. Install All Dependencies**
```bash
# From project root - installs root, backend, and frontend dependencies
npm run install:all

# Or manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

**3. Create Environment File**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
```

**4. Run Everything with One Command**
```bash
npm run dev
# This starts both backend (port 3000) and frontend (port 5173)
```

## 📁 Project Structure

```
A&AProj/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & environment config
│   │   ├── models/          # TypeORM entities
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth & error handling
│   │   ├── device-integration/  # TCP, Serial, USB, AOSP
│   │   └── utils/           # Excel import/export
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Dashboard, Students, Lectures, etc.
│   │   └── services/        # API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── IMPLEMENTATION_PLAN.md
└── README.md
```

## 🔌 API Reference

### Public/Device Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/device/logs` | Submit device logs |
| POST | `/api/v1/aosp/logs` | AOSP live scan event |
| POST | `/api/v1/aosp/sync` | AOSP batch sync |
| GET | `/api/v1/aosp/device-config` | Get device configuration |
| GET | `/api/v1/lectures/today` | Get today's lectures |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/admin/students` | List/Create students |
| PUT/DELETE | `/api/v1/admin/students/:id` | Update/Delete student |
| GET/POST | `/api/v1/admin/lectures` | List/Create lectures |
| POST | `/api/v1/admin/lectures/import` | Import from Excel |
| GET/POST | `/api/v1/admin/devices` | List/Create devices |
| GET | `/api/v1/admin/attendance` | Get attendance records |
| GET | `/api/v1/admin/attendance/export` | Export to Excel |

## 📱 AOSP Integration Guide

For Android devices to communicate with the backend:

### 1. Device Registration
First, create a device in the admin panel with AOSP connection enabled. This generates a unique token.

### 2. API Authentication
Include the token in your request headers:
```
x-device-token: <your-device-token>
```

### 3. Push Scan Events
```kotlin
// Example Kotlin code
val client = OkHttpClient()

val json = JSONObject().apply {
    put("biometric_user_id", "12345")
    put("timestamp", "2025-12-10T15:00:00Z")
    put("event_type", "face")
    put("device_token", "<your-device-token>")
}

val request = Request.Builder()
    .url("http://your-server:3000/api/v1/aosp/logs")
    .addHeader("x-device-token", "<your-device-token>")
    .post(json.toString().toRequestBody("application/json".toMediaType()))
    .build()

client.newCall(request).execute()
```

### 3. Batch Sync
```json
POST /api/v1/aosp/sync
{
    "device_token": "<your-device-token>",
    "logs": [
        {"biometric_user_id": "123", "timestamp": "...", "event_type": "face"},
        {"biometric_user_id": "456", "timestamp": "...", "event_type": "fingerprint"}
    ]
}
```

### 4. Get Configuration
```
GET /api/v1/aosp/device-config
Headers: x-device-token: <your-device-token>
```

Response includes device info, sync settings, and today's lecture schedule.

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 3000 |
| `DATABASE_HOST` | PostgreSQL host | localhost |
| `DATABASE_PORT` | PostgreSQL port | 5432 |
| `DATABASE_NAME` | Database name | lecture_attendance |
| `DATABASE_USER` | Database user | postgres |
| `DATABASE_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `AOSP_SECRET_KEY` | AOSP device auth key | - |
| `DEVICE_SYNC_INTERVAL_SECONDS` | Auto-sync interval | 30 |
| `ATTENDANCE_GRACE_PERIOD_MINUTES` | Early arrival window | 15 |
| `LATE_THRESHOLD_MINUTES` | Late threshold | 10 |

## 📊 Database Schema

The system uses 6 main tables:
- **students**: Student records with biometric IDs
- **biometric_templates**: Template storage (fingerprint/face/card)
- **lectures**: Lecture schedule (weekly or specific date)
- **attendance_records**: Processed attendance with status
- **devices**: Device configuration and connection settings
- **device_logs_raw**: Raw scan events from devices

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete ER diagram.

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"...","environment":"development"}
```

### Test AOSP Endpoint
```bash
curl -X POST http://localhost:3000/api/v1/aosp/logs \
  -H "Authorization: Bearer your_aosp_secret_key" \
  -H "Content-Type: application/json" \
  -d '{"biometric_user_id": "123", "timestamp": "2025-12-10T15:00:00Z"}'
```

## 📝 License

This project is provided as-is for educational and internal use.

## 👥 Support

For questions or issues, please create an issue in the project repository.
