# Lecture Attendance & Registration System - Implementation Plan

A complete, production-ready web-based system integrating with FingerTec Face ID 2 biometric terminal supporting TCP/IP, RS232/RS485, USB flash-disk import, and AOSP direct connection.

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL with strong FK support |
| **Frontend** | React + Vite + TypeScript |
| **Device Integration** | Custom modules for TCP/IP, Serial, USB, AOSP |
| **Export** | ExcelJS for XLSX generation |
| **Import** | SheetJS (xlsx) for Excel/CSV parsing |
| **Containerization** | Docker + docker-compose |

---

## Database Schema

### STUDENTS
- `student_id` (UUID, PK)
- `biometric_user_id` (string - ID used inside Face ID 2)
- `name` (string)
- `email` (string)
- `phone` (string)
- `department` (string)
- `status` (enum: active/inactive)
- `enrollment_date` (timestamp)
- `created_at`, `updated_at` (timestamps)

### BIOMETRIC_TEMPLATES
- `template_id` (UUID, PK)
- `student_id` (FK -> STUDENTS)
- `template_type` (enum: fingerprint/face/card)
- `template_data` (bytea - encrypted)
- `created_at`, `updated_at` (timestamps)

### LECTURES
- `lecture_id` (UUID, PK)
- `course_name` (string)
- `lecturer_name` (string)
- `day_of_week` (int, 0-6)
- `specific_date` (date, optional)
- `start_time` (time)
- `end_time` (time)
- `location` (string, optional)
- `created_at`, `updated_at` (timestamps)

### ATTENDANCE_RECORDS
- `attendance_id` (UUID, PK)
- `student_id` (FK -> STUDENTS)
- `lecture_id` (FK -> LECTURES)
- `scan_timestamp` (timestamp)
- `device_id` (FK -> DEVICES)
- `status` (enum: present/late/absent)
- `raw_log_id` (FK -> DEVICE_LOGS_RAW)
- `created_at` (timestamp)

### DEVICES
- `device_id` (UUID, PK)
- `biometric_device_id` (string)
- `ip_address` (string)
- `rs485_address` (string)
- `usb_enabled` (boolean)
- `aosp_connection_enabled` (boolean)
- `aosp_token` (string, encrypted)
- `location` (string)
- `last_sync_time` (timestamp)
- `created_at`, `updated_at` (timestamps)

### DEVICE_LOGS_RAW
- `raw_log_id` (UUID, PK)
- `biometric_user_id` (string)
- `device_id` (FK -> DEVICES)
- `log_timestamp` (timestamp)
- `event_type` (enum: fingerprint/face/card)
- `created_at` (timestamp)

---

## API Endpoints

### Public/Device APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/device/logs` | Device log submission |
| POST | `/api/v1/aosp/logs` | AOSP live scan event |
| POST | `/api/v1/aosp/sync` | AOSP batch sync |
| GET | `/api/v1/aosp/device-config` | Get device config for AOSP |
| GET | `/api/v1/lectures/today` | Today's lectures |
| GET | `/api/v1/student/:id` | Get student by ID |

### Admin APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/v1/admin/students` | Student management |
| CRUD | `/api/v1/admin/lectures` | Lecture management |
| CRUD | `/api/v1/admin/devices` | Device management |
| POST | `/api/v1/admin/lectures/import` | Import from Excel |
| GET | `/api/v1/admin/attendance` | Attendance summary |
| GET | `/api/v1/admin/attendance/export` | Export to XLSX |

---

## Attendance Logic

1. **Scan Event Received** → Find student by `biometric_user_id`
2. **Find Active Lecture** → Match timestamp to scheduled lecture
3. **Check for Duplicates** → Only first scan per student per lecture counts
4. **Determine Status**:
   - Within `start_time - 15min` to `start_time + grace_period` → **PRESENT**
   - After `start_time + grace_period` → **LATE**
   - No scan → **ABSENT**

---

## Device Integration Modes

1. **TCP/IP Mode**: Connect via static IP, pull logs via ZK protocol
2. **RS232/RS485 Mode**: Serial communication with configurable port/baud rate
3. **USB Flash Import**: Parse .dat/.txt files exported from device
4. **AOSP Direct Mode**: REST API for Android service integration

---

## Deployment

```bash
# Build and start all services
docker-compose up --build

# Or run individually
cd backend && npm run dev
cd frontend && npm run dev
```

Environment variables required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Authentication secret
- `AOSP_SECRET_KEY` - AOSP device authentication
