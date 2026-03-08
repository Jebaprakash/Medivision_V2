# MediVision AI

**Intelligent Medical Image Analysis and Hospital Recommendation System**

> 🩺 AI-powered diagnosis from medical images with hospital recommendations, medicine suggestions, and full patient history.

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│              │     │                  │     │                   │
│  React App   │────▶│  Node.js Express │────▶│  Spring Boot      │
│  (Vite)      │     │  API Gateway     │     │  Vision Service   │
│  Port 3000   │     │  Port 5000       │     │  Port 8081        │
│              │     │                  │     │                   │
└──────────────┘     └────────┬─────────┘     └────────┬──────────┘
                              │                        │
                              ▼                        ▼
                     ┌────────────────┐       ┌──────────────────┐
                     │  PostgreSQL    │       │  AI Vision API   │
                     │  Database      │       │  (OpenAI/Gemini) │
                     └────────────────┘       └──────────────────┘
```

## 📁 Project Structure

```
medivision-ai/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AuthForms.jsx     # Login & Register
│   │   │   ├── UploadPage.jsx    # Image upload & symptoms
│   │   │   ├── ResultsPage.jsx   # AI diagnosis results
│   │   │   ├── ChatbotPage.jsx   # AI Symptom Chatbot (NEW)
│   │   │   ├── ProgressPage.jsx  # Health Tracking & Charts (NEW)
│   │   │   ├── ReminderPage.jsx  # Medicine Reminders (NEW)
│   │   │   ├── HospitalMap.jsx   # Leaflet map with hospitals
│   │   │   └── HistoryPage.jsx   # Diagnosis history table
│   │   ├── services/
│   │   │   └── api.js            # Centralized Axios service
│   │   ├── App.jsx               # Router & layout
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                    # Node.js Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js           # Register & Login
│   │   │   ├── diagnose.js       # Image diagnosis
│   │   │   ├── chatbot.js        # AI Chat delegation (NEW)
│   │   │   ├── progress.js       # Disease tracking (NEW)
│   │   │   ├── reminders.js      # Medicine reminders (NEW)
│   │   │   ├── hospitals.js      # Nearby hospitals
│   │   │   └── history.js        # Diagnosis history
│   │   ├── reminder-worker.js    # Cron job & Push Notifications (NEW)
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT middleware
│   │   │   └── upload.js         # Multer config
│   │   ├── db.js                 # PostgreSQL pool
│   │   └── index.js              # Express entry point
│   └── package.json
│
├── vision-service/            # Spring Boot microservice
│   ├── src/main/java/com/medivision/
│   │   ├── controller/
│   │   │   ├── AnalyzeController.java
│   │   │   └── ChatController.java    # AI Text Chat Logic (NEW)
│   │   ├── service/
│   │   │   └── VisionAiService.java   # Gemini/OpenAI Core integration
│   │   ├── dto/
│   │   │   └── DiagnosisResponse.java
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   └── AiApiException.java
│   │   ├── config/
│   │   │   └── CorsConfig.java
│   │   └── VisionServiceApplication.java
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
│
├── database/
│   └── schema.sql             # Full PostgreSQL schema + seeds
│
├── .env.example               # Root env template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Java** 17+
- **Maven** 3.8+
- **PostgreSQL** 14+
- API key for OpenAI or Google Gemini

### 1. Database Setup

```bash
createdb medivision
psql -d medivision -f database/schema.sql
psql -d medivision -f database/update_schema.sql  # Added for Tracking & Reminders
```

### 2. Environment Variables

```bash
# Copy all env templates
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
cp vision-service/.env.example vision-service/.env

# Edit each .env with your actual values
```

### 3. Start Spring Boot Vision Service

```bash
cd vision-service
export AI_PROVIDER=gemini
export GEMINI_API_KEY=your-key-here
mvn spring-boot:run
```

### 4. Start Node.js Backend

```bash
cd server
npm install
npm start
```

### 5. Start React Frontend

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Environment Variables

| Variable | Service | Description |
|---|---|---|
| `AI_PROVIDER` | Vision Service | `openai` or `gemini` |
| `OPENAI_API_KEY` | Vision Service | OpenAI API key |
| `GEMINI_API_KEY` | Vision Service | Google Gemini API key |
| `DATABASE_URL` | Server | PostgreSQL connection string |
| `JWT_SECRET` | Server | Secret for JWT signing |
| `VISION_SERVICE_URL` | Server | Spring Boot URL (default: `http://localhost:8080`) |
| `VITE_API_URL` | Client | Backend API URL |
| `VITE_GOOGLE_MAPS_KEY` | Client | Google Maps API key (optional) |

---

## 🩺 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create new user |
| `POST` | `/api/auth/login` | No | Login & get JWT |
| `POST` | `/api/diagnose` | JWT | Upload image for AI diagnosis |
| `GET` | `/api/hospitals?lat=&lng=&radius=` | No | Find nearby hospitals |
| `GET` | `/api/history/:userId?page=&limit=` | JWT | Paginated diagnosis history |
| `GET` | `/api/health` | No | Health check |

---

## ⚕️ Disclaimer

> This system provides preliminary health information and should not replace professional medical advice. Always consult a qualified healthcare provider for accurate diagnosis and treatment.

# Medivision_V2
