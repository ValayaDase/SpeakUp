# SpeakUp — AI-Powered Personal Communication Coach

> *"Your personal AI communication coach. One platform. Every conversation. Continuous improvement."*

SpeakUp is a modern, production-minded web application engineered to elevate communication skills across formal and informal situations:
- **Professional**: Job Interviews, Technical System Design Interviews, HR Alignment, Business & Stakeholder Presentations, Team Standups, and Group Discussions.
- **Personal and Social**: Casual Small Talk, Narrative Storytelling, Persuasive Debates, Elevator Pitches, and Expressing Opinions.
- **Content Creation**: YouTube Intro/Tutorial Delivery, Podcast Solo Segments, and High-Energy Short-Form Videos.

---

## 🚀 Key Architectural Pillars

### 1. In-Browser Visual Telemetry (MediaPipe Tasks Vision)
- **Face, Pose, and Hand Landmarks**: Real-time evaluation of physical communication signals without invasive facial recognition or pseudoscience emotional inferences.
- **Calculated Signals**:
  - Hand movement frequency & gesture cadence (gestures/min).
  - Posture stability score & shoulder alignment (detects balanced stance vs. tilted slouching).
  - Head orientation & approximate direct camera lens gaze percentage.
- **Privacy-First**: Real-time landmark calculations run locally in the browser sandbox. Users can toggle camera tracking off at any point.

### 2. Precision Speech & Acoustic Analysis
- **Web Audio API**: Real-time frequency analyzer rendering responsive volume waveforms and computing RMS volume and peak decibels.
- **Speech-to-Text Transcription**: Browser Web Speech API & backend transcription engines capturing verbatim speech with timestamped segments.
- **Factual Speech Metrics**:
  - Words Per Minute (WPM) speaking cadence evaluated against the 125–155 conversational optimal range.
  - Filler word identification ("um", "uh", "like", "actually", "basically", etc.) with occurrence counts and timestamps.
  - Extended pauses (≥ 2.5s) analysis.
  - Lexical diversity (Type-Token Ratio) and speech clarity index.

### 3. Contextual Evidence-Based AI Feedback
- Structured evaluation powered by Google Gemini (e.g. `gemini-2.5-flash`) or OpenAI (`gpt-4o-mini`).
- **Deterministic Telemetry Fallback**: If third-party API keys are not supplied, the platform automatically provides evidence-based analysis computed directly from the transcript and telemetry, with transparent attribution.
- Outputs executive summaries, observed strengths, targeted improvement areas, timestamp-linked coaching notes (e.g. at 00:15, 01:20), and actionable drills.

### 4. Interactive AI Conversation Partner
- Dynamic multi-turn roleplay partner adapting to **Job Interviewer**, **Senior Colleague**, **Debate Opponent**, or **Casual Friend**.
- Generates contextual follow-ups that challenge and adapt to the speaker's answers.
- Difficulty adjustments across Beginner, Intermediate, and Advanced.
- Built-in text-to-speech audio synthesis.

### 5. Longitudinal Progress Tracking
- Interactive Recharts graphs monitoring cadence evolution (WPM), filler reduction curves, and scenario performance breakdowns.
- Consecutive session delta comparison (e.g., previous take vs. current take).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons, Axios |
| **Backend** | Node.js, Express.js (CommonJS), MongoDB, Mongoose, JWT (HTTP-only cookies), bcryptjs, Multer, Helmet, express-rate-limit |
| **Analysis** | MediaPipe Tasks Vision (client-side), Web Audio API, Web Speech Recognition, Gemini / OpenAI API |

---

## 📂 Project Structure

```
SpeakUp/
├── frontend/                     # Next.js 16 Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # SaaS Landing Page
│   │   │   ├── login/            # Sign In Page
│   │   │   ├── register/         # Registration with Goals & Languages
│   │   │   ├── forgot-password/  # Password Recovery
│   │   │   ├── dashboard/        # Interactive User Dashboard
│   │   │   ├── scenarios/        # Scenario Library & Config Modal
│   │   │   ├── practice/[id]/    # Live Recording Studio & AI Partner
│   │   │   ├── analysis/[id]/    # Comprehensive Multimodal Report
│   │   │   ├── progress/         # Recharts Longitudinal Trends
│   │   │   └── settings/         # Profile, Preferences, Privacy, Data Deletion
│   │   ├── components/
│   │   │   ├── ui/               # Button, Card, Badge, Modal, Input, Toast
│   │   │   └── layout/           # Navbar, Footer, Sidebar, AppLayout
│   │   ├── context/              # AuthContext (HTTP-only session restoration)
│   │   ├── data/                 # 14+ Scenarios & Categories
│   │   └── lib/                  # Centralized Axios client & MediaPipe Vision
│   ├── .env.example
│   └── .env.local
│
├── backend/                      # Express.js REST API (CommonJS - No src/)
│   ├── config/                   # MongoDB connection & constants
│   ├── models/                   # User, Session, Recording, Analysis
│   ├── controllers/              # Auth, Sessions, Recordings, Analysis, Users
│   ├── routes/                   # Clean Express router modules
│   ├── middleware/               # JWT auth cookie verification, upload, errorHandler
│   ├── services/                 # Speech analysis engine, AI feedback, AI partner
│   ├── utils/                    # JWT signing, standardized API responses
│   ├── uploads/                  # Secure disk storage for user takes
│   ├── app.js                    # Express app configuration & security headers
│   ├── server.js                 # App server entrypoint
│   ├── .env.example
│   └── .env
│
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/speakup
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key_optional
GEMINI_API_KEY=your_gemini_key_optional
MAX_FILE_SIZE=104857600
UPLOAD_DIR=uploads
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SpeakUp
```

---

## 🏃 Running the Application

### Prerequisites
- Node.js v18+ (tested on Node v22)
- MongoDB running locally on port 27017 (or remote MongoDB connection string in `.env`)

### 1. Launch Backend Server
```bash
cd backend
npm install
npm run dev # or npm start
```
The backend API initializes on `http://localhost:8000`. Test health:
```bash
curl http://localhost:8000/api/health
```

### 2. Launch Frontend Application
```bash
cd frontend
npm install
npm run dev # or npm run build && npm run start
```
Open `http://localhost:3000` in your browser.

---

## 🔒 Privacy & Security

- **Authentication**: JWT tokens stored exclusively in **HTTP-only cookies** (`SameSite: Lax`, `Secure` in production) to mitigate XSS attacks. No tokens in `localStorage`.
- **Media Privacy**: Video and audio recordings are stored on private disk storage and only accessible to the authenticated owner. No public bucket URLs.
- **Client-Side Telemetry**: Body and face landmarks are calculated in-memory in the browser.
- **GDPR & Right to be Forgotten**: Complete one-click account and data purge in Settings removes all database records and physical video files from disk immediately.

---

## 📡 API Reference Summary

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/auth/register` | POST | Public | Create new account with goals & preferences |
| `/api/auth/login` | POST | Public | Sign in & set HTTP-only cookie |
| `/api/auth/logout` | POST | Public | Clear HTTP-only cookie |
| `/api/auth/me` | GET | Private | Restore current authenticated session |
| `/api/sessions` | POST | Private | Create new practice session |
| `/api/sessions` | GET | Private | List user's practice sessions |
| `/api/sessions/:id` | GET | Private | Get session, recording, and analysis |
| `/api/sessions/:id/ai-chat` | POST | Private | Multi-turn AI roleplay partner turn |
| `/api/sessions/:id` | DELETE | Private | Delete session and associated recording/analysis |
| `/api/recordings/upload`| POST | Private | Multer upload for video take |
| `/api/recordings/:id` | GET | Private | Secure range-supported video streaming |
| `/api/analysis/:id` | POST | Private | Compute speech & visual telemetry report |
| `/api/analysis/:id` | GET | Private | Fetch completed multimodal report |
| `/api/users/profile` | GET / PUT| Private | Retrieve and update user profile & privacy |
| `/api/users/progress` | GET | Private | Longitudinal Recharts progress analytics |
| `/api/users/account` | DELETE | Private | Permanently purge account & all data |

---

## 📄 License
MIT License. Created for the SpeakUp Communication Platform.
