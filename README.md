# 🛡️ ProxiX: Smart Anti-Proxy Attendance System

ProxiX is a dual-portal (Web + Mobile), secure attendance verification ecosystem designed to eliminate proxy attendance in educational institutions. By combining **dynamically rotating QR codes**, **one-device account binding (device-locking)**, and **local biometric authentication (face/fingerprint)**, ProxiX ensures that attendance can *only* be marked by the actual student present in the classroom.

---

## 🚀 Key Features

* **⏱️ Dynamically Rotating QR Sessions**: The Faculty portal generates a live QR code containing a secure token that rotates every 5 seconds. This prevents students from taking pictures/screenshots of the QR code and sharing them with absent peers.
* **📱 One-Person-One-Device Locking**: Each student account is bound to a unique hardware UUID during first login. Logging in on a new device triggers an OTP verification check (using mock OTP code `123456`) to restrict login sharing.
* **🔒 Biometric Verification**: After scanning a valid live QR, students must authenticate using their device's native biometric sensors (fingerprint/face recognition) before attendance is submitted.
* **⚙️ Live Real-time Sync**: Attendance statuses populate instantly on the teacher's dashboard in real-time as students scan, powered by Supabase Real-Time subscriptions.
* **🔐 Sealed/Locked Attendance**: Teachers can lock sessions to permanently seal attendance. Manual overrides are tracked and require teachers to enter an override justification log.
* **📊 Analytics Center**: Detailed view for both students and faculty showing attendance percentages, class counts, and warning flags for students below the 75% threshold.

---

## 🏗️ Repository Architecture

The repository contains two main applications:

```text
ProxiX/
├── proxix-teacher/          # Root React Web Application (Faculty Dashboard)
│   ├── src/
│   │   ├── App.js           # Faculty portal logic, QR gen, and Realtime dashboard
│   │   └── supabaseClient.js# Supabase DB connection config
│   ├── check_db_probe.js    # Database connection test scripts
│   ├── reset_demo.js        # Helper script to clear mock sessions and reset device binds
│   └── package.json
│
└── proxix-student/          # Nested Expo Native Application (Student Client)
    ├── src/
    │   ├── screens/         # Mobile App screen files
    │   │   ├── LoginScreen.js      # Device-binding & Login flow
    │   │   ├── DashboardScreen.js  # Live timetable & session poller
    │   │   ├── ScannerScreen.js    # Camera QR code reader + Native Biometrics
    │   │   └── AnalyticsScreen.js  # Personal attendance statistics
    │   └── supabaseClient.js# Supabase DB connection config
    └── app.json             # Expo project configuration
```

---

## 🛠️ Tech Stack

### Faculty Portal (Web)
* **Framework**: React 19 (`react-scripts`)
* **Styling**: TailwindCSS
* **Icons**: Lucide Icons
* **Utilities**: `react-qr-code` for dynamic QR rendering
* **Backend Integration**: `@supabase/supabase-js`

### Student Client (Mobile)
* **Framework**: React Native with **Expo (SDK 54)**
* **Biometrics**: `expo-local-authentication`
* **Secure Storage**: `expo-secure-store`
* **Scanner**: `expo-camera`
* **Navigation**: React Navigation (Native Stack & Bottom Tabs)

---

## 💾 Database Setup

ProxiX is powered by **Supabase**. To configure your database, create the following 5 tables in your Supabase SQL editor:

```sql
-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK (role IN ('teacher', 'student')) NOT NULL,
  device_id TEXT UNIQUE
);

-- 2. Classes Table
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  subject_code TEXT UNIQUE NOT NULL
);

-- 3. Timetable Schedule Table
CREATE TABLE schedule (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id),
  subject TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT NOT NULL
);

-- 4. Active Sessions Table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES schedule(id),
  qr_token TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  session_date DATE NOT NULL,
  is_locked BOOLEAN DEFAULT false
);

-- 5. Attendance Logs Table
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  session_id INTEGER REFERENCES sessions(id),
  method TEXT CHECK (method IN ('QR', 'Manual')) NOT NULL,
  face_verified BOOLEAN DEFAULT false,
  fingerprint_verified BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now(),
  edit_reason TEXT
);
```

> [!TIP]
> After setting up the tables, update the configuration files `src/supabaseClient.js` (in both `proxix-teacher` and `proxix-student`) with your project's custom URL and publishable/anonymous API key.

---

## ⚡ Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed. For running the mobile application, install the **Expo Go** app on your physical iOS/Android device.

### 2. Running the Faculty Portal
```bash
# Navigate to the faculty portal root
cd proxix-teacher

# Install dependencies
npm install

# Start the local development web server
npm start
```
*The web portal will open automatically at [http://localhost:3000](http://localhost:3000).*

### 3. Running the Student Mobile App
```bash
# Navigate to the student project folder
cd proxix-teacher/proxix-student

# Install Expo dependencies
npm install

# Run the Expo dev server
npx expo start
```
*Scan the QR code displayed in your terminal using the **Expo Go** app on your phone to run the app on your physical device.*

---

## 👥 Developers
* **Paras Jain** 
* **Riwitika Gupta**