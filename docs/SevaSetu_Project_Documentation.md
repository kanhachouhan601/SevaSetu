# SevaSetu Project Documentation

Version: 1.0  
Frontend live URL: https://sevasetu-frontend.vercel.app  
Backend live URL: https://sevasetu-ebtq.onrender.com  
Backend health check: https://sevasetu-ebtq.onrender.com/api/health  
GitHub repo: https://github.com/kanhachouhan601/SevaSetu

## 1. Project Overview

SevaSetu is a home nursing platform MVP with three user roles:

- Patient: books a nurse, tracks status, shares OTPs, rates completed care.
- Nurse: registers with documents, accepts requests, checks in/out, raises SOS, reports unsafe patient behavior, sees earnings.
- Admin: approves/rejects nurses, reviews patients/requests, handles safety alerts, verifies patient addresses.

This project is deployed as:

- Frontend: React + Vite on Vercel.
- Backend: Node.js + Express on Render.
- Database: MongoDB Atlas.
- AI provider: Gemini/OpenAI/Groq compatible backend service, currently configured through environment variables.

## 2. Repository Structure

```txt
SevaSetu/
  nurseconnect-frontend/
    src/
      api/axios.js
      components/LanguageSelector.jsx
      context/AuthContext.jsx
      context/LanguageContext.jsx
      pages/
        PatientDashboard.jsx
        NurseDashboard.jsx
        AdminDashboard.jsx
        Login.jsx
        Register.jsx
        HomePage.jsx
        NurseInterview.jsx
    vercel.json
    package.json

  nurseconnect-backend/
    src/
      config/db.js
      controllers/
      middleware/
      models/
      routes/
      services/aiProvider.service.js
    render.yaml
    server.js
    package.json

  .gitignore
  docs/
```

## 3. Connectivity Summary

### Frontend to Backend

Frontend API client:

```txt
nurseconnect-frontend/src/api/axios.js
```

It reads:

```txt
VITE_API_URL
```

Production value:

```txt
https://sevasetu-ebtq.onrender.com
```

If `VITE_API_URL` is missing, frontend falls back to:

```txt
http://localhost:3000
```

### Backend to MongoDB

Backend DB config:

```txt
nurseconnect-backend/src/config/db.js
```

It reads:

```txt
MONGODB_URI
```

This is stored only in Render environment variables. Do not commit it.

### CORS

Backend CORS uses:

```txt
FRONTEND_URL
```

Production value:

```txt
https://sevasetu-frontend.vercel.app
```

This allows the Vercel frontend to call the Render backend.

## 4. Environment Variables

### Backend Render Variables

```txt
MONGODB_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
FRONTEND_URL=https://sevasetu-frontend.vercel.app
AI_PROVIDER=gemini
GEMINI_API_KEY=<Gemini API key>
```

Optional:

```txt
GEMINI_MODEL=gemini-2.0-flash
OPENAI_API_KEY=<OpenAI key>
OPENAI_MODEL=gpt-4o-mini
GROQ_API_KEY=<Groq key>
GROQ_MODEL=<Groq model>
GMAIL_USER=<Gmail address>
GMAIL_PASS=<Gmail app password>
LONGTERM_INTERVIEW_DELAY_MINUTES=60
```

### Frontend Vercel Variables

```txt
VITE_API_URL=https://sevasetu-ebtq.onrender.com
```

Note: `VITE_` variables are visible in browser bundles. This is safe for a public backend URL, but not safe for secrets.

## 5. Security and Git Safety

The root `.gitignore` protects:

```txt
.env
.env.*
nurseconnect-backend/.env
nurseconnect-frontend/.env
node_modules/
dist/
uploads/
.DS_Store
*.log
```

Never push:

- MongoDB URI
- JWT secret
- Gemini/OpenAI/Groq keys
- Gmail app password
- `.env` files

Before pushing, check:

```bash
git status
```

If `.env` appears in `git status`, stop and fix `.gitignore`.

## 6. Main Features

### 6.1 Authentication and Roles

Users can login/register and are redirected by role:

- Patient -> `/patient`
- Nurse -> `/nurse`
- Admin -> `/admin`

Important files:

```txt
nurseconnect-frontend/src/context/AuthContext.jsx
nurseconnect-backend/src/controllers/auth.controller.js
nurseconnect-backend/src/middleware/auth.middleware.js
nurseconnect-backend/src/middleware/role.middleware.js
```

Test flow:

1. Open frontend.
2. Register/login as patient.
3. Confirm patient dashboard opens.
4. Register/login as nurse.
5. Confirm nurse dashboard opens.
6. Login as admin.
7. Confirm admin dashboard opens.

Expected result: each role opens only its allowed dashboard.

### 6.2 Patient Booking

Patient can submit a home nursing request with:

- Problem
- Requirements
- Temporary/long-term mode
- Address
- Optional current location for temporary visits
- Optional medical files/photos

Important files:

```txt
nurseconnect-frontend/src/pages/PatientDashboard.jsx
nurseconnect-backend/src/controllers/request.controller.js
nurseconnect-backend/src/models/Request.js
```

Test flow:

1. Login as patient.
2. Fill "Book a Nurse".
3. Use sample problem: `Injection and BP monitoring needed`.
4. Select Temporary.
5. Enter address.
6. Submit request.
7. Check "My Requests".

Expected result:

- Request appears in "My Requests".
- Amount appears, for example `₹650`.
- Status is pending or matched depending on nurse actions.

### 6.3 Auto Amount Estimate

Amount is automatically calculated by backend. Patient does not type amount.

Current simple rules:

- Temporary base: `₹500`
- Long-term base: `₹1200`
- Extra for ICU/emergency/night/wound/injection/monitoring keywords.
- Temporary max cap: `₹1500`
- Long-term max cap: `₹2500`

Important file:

```txt
nurseconnect-backend/src/controllers/request.controller.js
```

Test flow:

1. Create a request with `Injection and BP monitoring needed`.
2. Check patient request card.
3. Check nurse open request card.

Expected result: same estimated amount appears for patient and nurse.

### 6.4 Nurse Matching and Accept Flow

Backend shortlists approved and available nurses based on:

- Specialization
- Experience
- Interview score
- Rating
- Documents
- City/location

Temporary requests prefer nearest nurse if location is available.

Test flow:

1. Admin approves nurse profile.
2. Nurse goes online.
3. Patient creates request.
4. Nurse opens "Open Requests".
5. Nurse accepts request.

Expected result:

- Request moves to nurse "Assigned Requests".
- Patient sees assigned nurse and ETA where available.

### 6.5 Temporary ETA and Location

When nurse accepts a temporary request, backend estimates:

- Distance
- Arrival minutes
- ETA time

Important fields:

```txt
rideTracking.estimatedDistanceKm
rideTracking.estimatedArrivalMinutes
arrivalEtaAt
```

Test flow:

1. Patient uses current location while booking.
2. Nurse updates current location.
3. Nurse accepts temporary request.

Expected result:

- Patient sees "Nurse is on the way".
- ETA is shown.

### 6.6 Long-Term AI Interview

Long-term flow schedules a 25-30 minute AI clinical interview for nurse before final assignment.

Important files:

```txt
nurseconnect-frontend/src/pages/NurseInterview.jsx
nurseconnect-backend/src/controllers/request.controller.js
nurseconnect-backend/src/services/aiProvider.service.js
```

Test flow:

1. Patient creates long-term request.
2. Nurse accepts request.
3. Nurse sees scheduled interview.
4. Nurse opens interview at scheduled time.
5. Nurse answers questions.
6. AI scores interview.

Expected result:

- If passed, request moves to matched.
- If failed, nurse is removed and next shortlisted nurse can be notified.

### 6.7 OTP Check-In and Check-Out

Patient dashboard shows:

- Check-in OTP
- Check-out OTP

Nurse uses these OTPs to start and complete visit.

Important endpoints:

```txt
POST /api/request/:id/visit/check-in
POST /api/request/:id/visit/check-out
```

Test flow:

1. Nurse accepts request.
2. Patient gives check-in OTP.
3. Nurse enters OTP and clicks Check-in.
4. Request becomes in-progress.
5. Patient gives check-out OTP.
6. Nurse enters OTP and clicks Check-out.
7. Request becomes completed.

Expected result:

- Check-in starts visit.
- Check-out completes visit.
- Patient can rate nurse.
- Nurse earnings increase by request amount.

### 6.8 Nurse Earnings

When request is completed through OTP check-out, backend increments nurse earnings.

Important file:

```txt
nurseconnect-backend/src/controllers/request.controller.js
```

Test flow:

1. Create request with amount shown, for example `₹650`.
2. Nurse completes check-in/check-out.
3. Refresh nurse dashboard/profile.

Expected result: nurse earnings increase by `₹650`.

### 6.9 Patient Rating

After request is completed, patient can rate nurse:

- 1-5 stars
- Behavior
- Care quality
- Comment

Important endpoint:

```txt
POST /api/request/:id/rating
```

Test flow:

1. Complete a visit.
2. Patient opens completed request.
3. Select rating and submit.

Expected result:

- Rating is saved.
- Nurse profile average rating updates.

### 6.10 Safety Review

Backend marks request for safety review if:

- Patient has unsafe flag
- Night visit
- Safety-sensitive requirement
- High-dependency long-term case
- Address not verified

Admin can approve safety review.

Important files:

```txt
nurseconnect-backend/src/models/SafetyAlert.js
nurseconnect-backend/src/controllers/request.controller.js
nurseconnect-backend/src/controllers/admin.controller.js
nurseconnect-frontend/src/pages/AdminDashboard.jsx
```

Test flow:

1. Create request with unverified address or night/sensitive words.
2. Admin opens Safety tab.
3. Admin approves safety.
4. Patient/nurse see approved status.

Expected result: safety review alert appears and can be approved.

### 6.11 Emergency SOS

Nurse can raise emergency SOS from matched/in-progress request.

Endpoint:

```txt
POST /api/request/:id/safety/sos
```

Test flow:

1. Nurse opens assigned request.
2. Click Emergency SOS.
3. Confirm prompt.
4. Admin opens safety panel.

Expected result:

- Critical alert is created.
- Admin receives notification.
- Patient receives safety notification.

### 6.12 Patient Behavior Report

After completion, nurse can submit patient/family behavior report:

- Respectful/rude/harassment concern
- Safe/unsafe environment
- Payment issue
- Unsafe flag
- Comment

If unsafe, patient safety flag is updated.

Endpoint:

```txt
POST /api/request/:id/safety/patient-report
```

Test flow:

1. Complete visit.
2. Nurse opens completed request.
3. Submit behavior report.
4. If unsafe is selected, admin checks safety panel/patient table.

Expected result: unsafe patient flag and alert appear.

### 6.13 AI Health Assistant with Mic

Patient dashboard has floating AI Health Assistant.

Features:

- Chat with AI health companion.
- Mic button converts speech to input text.
- User still controls send button.
- Send stops mic automatically.

Important file:

```txt
nurseconnect-frontend/src/pages/PatientDashboard.jsx
```

Test flow:

1. Patient opens dashboard.
2. Click AI Health Assistant.
3. Click mic button.
4. Speak in Hindi/Hinglish.
5. Confirm text appears in input.
6. Click send.

Expected result: assistant replies.

### 6.14 Language Dropdown

Languages currently available:

- English
- Hindi
- Hinglish

Selector appears on:

- Login
- Register
- Home
- Patient dashboard
- Nurse dashboard

Preference is saved in localStorage.

Important files:

```txt
nurseconnect-frontend/src/context/LanguageContext.jsx
nurseconnect-frontend/src/components/LanguageSelector.jsx
```

Test flow:

1. Open login page.
2. Select Hindi.
3. Navigate to patient/nurse dashboard.
4. Refresh page.

Expected result:

- Selected language stays after refresh.
- Main labels and next-step messages change.

### 6.15 Notifications

Notifications exist for:

- Request created
- Request matched
- Request completed
- Safety/SOS alerts
- Nurse approved/rejected
- System messages

Frontend polls notifications every 15 seconds.

Important files:

```txt
nurseconnect-backend/src/models/Notification.js
nurseconnect-backend/src/controllers/notification.controller.js
nurseconnect-frontend/src/pages/PatientDashboard.jsx
nurseconnect-frontend/src/pages/NurseDashboard.jsx
```

Test flow:

1. Patient creates request.
2. Nurse receives notification.
3. Nurse accepts request.
4. Patient receives notification.

Expected result: bell count updates and dropdown shows messages.

### 6.16 Admin Dashboard

Admin can:

- View stats
- Approve/reject nurses
- View patients
- Verify patient address
- Clear unsafe patient flag
- View requests
- Review safety alerts
- Approve safety review
- Resolve safety alerts

Important file:

```txt
nurseconnect-frontend/src/pages/AdminDashboard.jsx
```

Test flow:

1. Login as admin.
2. Open Nurses tab.
3. Approve pending nurse.
4. Open Patients tab.
5. Verify address.
6. Open Safety tab.
7. Resolve/approve alert.

Expected result: admin actions update data and notifications.

## 7. Deployment Documentation

### 7.1 GitHub Setup

Commands used:

```bash
echo "# SevaSetu" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/kanhachouhan601/SevaSetu.git
git push -u origin main
```

After `.gitignore` was added and project files were safe:

```bash
git add .
git commit -m "Add SevaSetu app source"
git push origin main
```

Later commits:

```bash
git add nurseconnect-frontend/.gitignore
git commit -m "Ignore Vercel local config"
git push origin main

git add nurseconnect-frontend/src
git commit -m "Add language selector"
git push origin main
```

### 7.2 MongoDB Atlas Setup

Steps:

1. Create MongoDB Atlas account.
2. Create free M0 cluster.
3. Create database user.
4. Allow network access:

```txt
0.0.0.0/0
```

5. Copy driver connection string.
6. Replace password in URI.
7. Paste URI in Render env variable:

```txt
MONGODB_URI
```

Do not paste Mongo URI in chat or GitHub.

### 7.3 Render Backend Deploy

Render service settings:

```txt
Service Type: Web Service
Repo: kanhachouhan601/SevaSetu
Branch: main
Root Directory: nurseconnect-backend
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free
```

Environment variables:

```txt
MONGODB_URI=<secret>
JWT_SECRET=<secret>
AI_PROVIDER=gemini
GEMINI_API_KEY=<secret>
FRONTEND_URL=https://sevasetu-frontend.vercel.app
```

After changing env variables, choose:

```txt
Save, rebuild and deploy
```

Backend health check:

```txt
https://sevasetu-ebtq.onrender.com/api/health
```

Expected:

```json
{
  "status": "ok"
}
```

### 7.4 Vercel Frontend Deploy

Vercel project linked with:

```bash
cd /Users/apple/Documents/SevaSetu/nurseconnect-frontend
vercel link
```

Production API env added:

```bash
vercel env add VITE_API_URL production
```

Value:

```txt
https://sevasetu-ebtq.onrender.com
```

Manual production deploy:

```bash
vercel --prod
```

Live frontend:

```txt
https://sevasetu-frontend.vercel.app
```

If GitHub auto deploy does not update frontend, run:

```bash
cd /Users/apple/Documents/SevaSetu/nurseconnect-frontend
vercel --prod
```

Then hard refresh:

```txt
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

## 8. Commands Used During Development

### Check project files

```bash
rg --files
rg -n "safety|SOS|OTP|amount"
sed -n '1,260p' file
git status --short
```

### Frontend build check

```bash
cd /Users/apple/Documents/SevaSetu/nurseconnect-frontend
npm run build
```

### Backend syntax checks

```bash
cd /Users/apple/Documents/SevaSetu/nurseconnect-backend
node --check src/controllers/request.controller.js
node --check src/controllers/admin.controller.js
```

### Dev server commands

Frontend:

```bash
cd nurseconnect-frontend
npm run dev
```

Backend:

```bash
cd nurseconnect-backend
npm run dev
```

Note: local sandbox blocked port binding during this session. On your normal terminal, these commands should work.

### Git update commands

Normal future update:

```bash
cd /Users/apple/Documents/SevaSetu
git status
git add .
git commit -m "update"
git push origin main
```

### Vercel status and manual deploy

```bash
cd /Users/apple/Documents/SevaSetu/nurseconnect-frontend
vercel ls sevasetu-frontend
vercel --prod
```

### Vercel env

```bash
vercel env add VITE_API_URL production
vercel env ls
```

## 9. Future Update Process

For normal code changes:

1. Edit code locally.
2. Run checks.
3. Commit and push.

```bash
git add .
git commit -m "update"
git push origin main
```

Expected:

- Render redeploys backend if backend changed.
- Vercel redeploys frontend if configured to auto deploy.

If Vercel does not update:

```bash
cd nurseconnect-frontend
vercel --prod
```

If Render does not update:

1. Open Render service.
2. Click Manual Deploy.
3. Select latest commit.

## 10. Common Errors and Fixes

### CORS error in browser

Cause: backend `FRONTEND_URL` does not match frontend URL.

Fix:

1. Render -> backend service -> Environment.
2. Set:

```txt
FRONTEND_URL=https://sevasetu-frontend.vercel.app
```

3. Save, rebuild and deploy.

### Frontend calls localhost after deployment

Cause: missing Vercel `VITE_API_URL`.

Fix:

```bash
cd nurseconnect-frontend
vercel env add VITE_API_URL production
vercel --prod
```

Value:

```txt
https://sevasetu-ebtq.onrender.com
```

### Render first request is slow

Cause: Render free instance spins down after inactivity.

Fix: wait 30-60 seconds and retry.

### Check-in failed

Possible causes:

- Wrong OTP
- Request not assigned
- Backend server error
- Old backend build

Expected wrong OTP message:

```txt
Invalid check-in OTP
```

If generic failure happens, check Render logs.

### Vercel does not show latest code

Fix:

```bash
cd nurseconnect-frontend
vercel --prod
```

Then hard refresh.

### `.env` accidentally tracked

Fix:

```bash
git rm --cached nurseconnect-backend/.env
git commit -m "Remove env from git"
git push origin main
```

Then rotate exposed secrets immediately.

## 11. Full End-to-End Demo Flow

### Patient + Nurse + Admin

1. Open frontend.
2. Register nurse.
3. Admin approves nurse.
4. Nurse logs in and goes online.
5. Patient logs in.
6. Patient books temporary nurse request.
7. Nurse accepts request.
8. Patient shares check-in OTP.
9. Nurse checks in.
10. Patient shares check-out OTP.
11. Nurse checks out.
12. Patient rates nurse.
13. Nurse earnings update.
14. Admin checks requests/safety/dashboard.

Expected final result:

- Request status completed.
- Nurse earnings increased.
- Patient rating saved.
- Admin can view completed request.

## 12. Feature Files Map

```txt
Authentication:
  frontend/src/context/AuthContext.jsx
  backend/src/controllers/auth.controller.js

Language:
  frontend/src/context/LanguageContext.jsx
  frontend/src/components/LanguageSelector.jsx

Patient dashboard:
  frontend/src/pages/PatientDashboard.jsx

Nurse dashboard:
  frontend/src/pages/NurseDashboard.jsx

Admin dashboard:
  frontend/src/pages/AdminDashboard.jsx

Requests:
  backend/src/models/Request.js
  backend/src/controllers/request.controller.js
  backend/src/routes/request.routes.js

Safety:
  backend/src/models/SafetyAlert.js
  backend/src/controllers/admin.controller.js
  backend/src/controllers/request.controller.js

Notifications:
  backend/src/models/Notification.js
  backend/src/controllers/notification.controller.js

AI:
  backend/src/services/aiProvider.service.js
  backend/src/controllers/ai.controller.js
  frontend/src/pages/NurseInterview.jsx

Deployment:
  frontend/vercel.json
  backend/render.yaml
```

## 13. Current Live Links

```txt
Frontend:
https://sevasetu-frontend.vercel.app

Backend:
https://sevasetu-ebtq.onrender.com

Health:
https://sevasetu-ebtq.onrender.com/api/health

GitHub:
https://github.com/kanhachouhan601/SevaSetu
```

## 14. Notes for CMHO/Demo Submission

This project is a working MVP/demo, not a fully hardened production healthcare system yet.

For approval/pilot submission, prepare:

- Project proposal
- Demo video
- Safety protocol
- Nurse verification process
- Patient consent text
- Privacy policy
- Emergency/SOS escalation process
- Pilot plan
- Test logs/screenshots

Production hardening still recommended:

- Real SMS/WhatsApp OTP
- Payment gateway
- Live socket notifications
- Strong security audit
- Legal review
- Medical governance/SOP review
- Monitoring and backups
