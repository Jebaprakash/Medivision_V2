# 🩺 MediVision AI

**Intelligent Skin Disease Detection and Hospital Recommendation System**

---

## 🎯 Project Purpose & Problem Statement

**The Problem:** 
Dermatological conditions are common, but access to specialized dermatologists can be delayed by long wait times, geographic limitations, or high consultation costs. Even when patients experience alarming symptoms (like suspected melanoma), they often lack immediate, accessible tools to assess the severity of their condition and find the right medical help nearby.

**The Solution:**
MediVision AI bridges the gap between AI-driven medical preliminary analysis and real-world medical assistance. The primary purpose of this platform is to provide users with a secure, instant, and intelligent preliminary diagnosis of visual skin conditions. Secondary to the AI analysis, the platform immediately connects patients with actionable solutions: recommending specific medicines, locating nearby emergency hospitals using real-time maps, and facilitating bookings with a curated database of medical professionals.

---

## 💻 Comprehensive Technology Stack

MediVision AI is built on a modern, highly decoupled microservices architecture. This ensures scalability, fault tolerance, and clear separation of concerns.

### 1. Frontend Interface
- **Framework:** React.js powered by Vite for lightning-fast hot-module reloading and optimized builds.
- **Styling & Animations:** Custom CSS with CSS Variables for theming, enhanced with `framer-motion` for smooth, dynamic page transitions and interactive UI elements.
- **Maps:** `Leaflet.js` and `react-leaflet` to render interactive geographical maps dynamically.

### 2. API Gateway & Primary Backend (Port 5000)
- **Runtime & Framework:** Node.js with Express.js.
- **Security & File Handling:** 
  - `jsonwebtoken` (JWT) for secure, stateless user authentication.
  - `multer` for intercepting, validating (MIME type checking), and temporarily storing medical image uploads before they hit the AI.
- **Database Driver:** `pg` (node-postgres) for efficient connection pooling to the database.
- **Architecture:** Follows a strict `controllers → services → routes` architectural pattern.

### 3. AI Vision Microservice (Port 5002)
- **Framework:** Java 11 with Spring Boot (v2.7+).
- **Communication:** Uses Spring WebFlux (`WebClient`) to perform non-blocking, asynchronous HTTP requests to external AI providers.
- **Responsibility:** Strictly handles the heavy lifting of prompting Generative AI models. It converts files to Base64, executes strict prompt engineering to force JSON outputs, and parses the results safely.

### 4. Database Storage
- **System:** PostgreSQL.
- **Schema Management:** Relational tables governing `users`, a dynamic `doctors` directory, `diagnosis_history` for persistent patient records, `hospitals` (cached), and `medicines`.

### 5. External APIs & Third-Party Integrations
- **Google Gemini API (`gemini-flash-latest`):** The core AI engine. It parses uploaded images against medical prompts to detect conditions like Eczema, Psoriasis, Melanoma, or Acne.
- **OpenStreetMap & Overpass API:** Used dynamically to bypass static data. Queries real-world hospital locations based on the user's exact latitude/longitude.

---

## 👩‍⚕️ Primary Use Cases

1. **The Anxious Patient (Preliminary Diagnosis):**
   - *Scenario:* A user develops a strange, persistent rash and is unsure if it's an allergic reaction or a fungal infection.
   - *Action:* They snap a photo on their phone, upload it to MediVision AI, and select "Itching" and "Redness" as symptoms.
   - *Resolution:* The AI returns a diagnosis of "Eczema" with 85% confidence, suggests avoiding hot showers, and recommends an over-the-counter hydrocortisone cream.

2. **The Medical Emergency (Melanoma Suspected):**
   - *Scenario:* A user takes a photo of an irregular, discolored mole.
   - *Action:* The image is analyzed by the Java Vision Microservice. 
   - *Resolution:* The AI detects a high probability of Melanoma. The system immediately triggers a glowing red "🚨 Emergency Action Required" overlay, classifying the severity as "severe," and automatically prompts the user to route to the nearest emergency hospital map.

3. **Geographical Healthcare Routing (Finding Hospitals):**
   - *Scenario:* A user arrives in a new city, experiences a severe skin burn, and doesn't know where the nearest clinic is.
   - *Action:* They click the "Hospitals" tab. The Node backend pings OpenStreetMap relative to their browser's GPS coordinates.
   - *Resolution:* An interactive Leaflet map populates with nearby emergency wards and clinics, displaying exactly how many kilometers away they are (calculated via the Haversine formula).

4. **Booking a Specialist (Telemedicine Directory):**
   - *Scenario:* Following an AI diagnosis of severe Acne, the user requires prescription medication.
   - *Action:* The user navigates to the "Doctors" portal, filtering the PostgreSQL-backed directory by "Dermatologist" and their specific "City".
   - *Resolution:* The user views the doctor's consultation fee, ratings, and experience, and seamlessly clicks "Book Consultation."

5. **Chronic Condition Tracking:**
   - *Scenario:* A patient dealing with Psoriasis needs to track the visual progression of their flares over several months.
   - *Action:* They utilize the "History" tab.
   - *Resolution:* Every image they've uploaded previously is saved in the database alongside the historical AI confidence scores, allowing them and their doctor to visually track if the severity of the flare-ups is increasing or decreasing over time.

---

## 🚀 How the AI Pipeline Flows (Under the Hood)

1. **Ingestion:** The user uploads a photo (`rash.jpg`) and selects symptoms on the React frontend.
2. **Gateway Validation:** The Node.js Express server receives the request. `multer` verifies it's a valid JPG/PNG under 10MB. Node explicitly pings the Java Microservice (`/health`) to confirm it is online.
3. **AI Inference:** Node.js forwards the image to the Java Spring Boot service. Java converts the image to Base64, attaches a heavily restricted medical prompt (instructing the AI to only output JSON and to reject non-skin images), and sends it to the **Gemini Vision API**.
4. **Data Structuring:** Java receives the raw text, parses it into strict JSON mapping `disease`, `confidence`, `severity`, and `medicines`, and returns it to Node.js.
5. **Database Logging:** Node.js logs the event to the PostgreSQL `diagnosis_history` table for tracking.
6. **UI Rendering:** React parses the JSON bundle and beautifully renders the diagnosis, generating severity badges or low-confidence warnings dynamically.
