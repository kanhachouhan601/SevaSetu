# NurseConnect Backend API

**Node.js + Express + MongoDB** backend for the NurseConnect home healthcare platform.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Run Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:3000`

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens (make it long & random) |
| `AI_PROVIDER` | AI provider: `groq`, `openai`, or `gemini` |
| `GROQ_API_KEY` | Groq API key for free/low-cost testing |
| `GROQ_MODEL` | Groq model name, default: `llama-3.1-8b-instant` |
| `OPENAI_API_KEY` | OpenAI API key for production |
| `OPENAI_MODEL` | OpenAI model name, default: `gpt-4o-mini` |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `GEMINI_MODEL` | Gemini model name, default: `gemini-2.0-flash` |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_PASS` | Gmail App Password (not your real password) |
| `PORT` | Server port (default: 3000) |
| `FRONTEND_URL` | Frontend URL for CORS & email links |

For free/low-cost AI testing:
```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
```

For production:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=client_openai_key
OPENAI_MODEL=gpt-4o-mini
```

### Getting Gmail App Password:
1. Go to Google Account → Security → 2-Step Verification (enable it)
2. Then go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create a new App Password → Copy it to `GMAIL_PASS`

---

## 📡 API Reference

All protected routes require: `Authorization: Bearer <jwt_token>`

### AUTH
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register user (role: patient/nurse/admin) |
| POST | `/api/auth/login` | ❌ | Login, returns JWT token |
| GET | `/api/auth/me` | ✅ | Get logged-in user info |

#### Register Body:
```json
{
  "name": "Riya Sharma",
  "email": "riya@example.com",
  "password": "password123",
  "phone": "9876543210",
  "role": "patient",
  "address": "123 MG Road",
  "city": "Indore"
}
```

---

### NURSE
| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/nurse/profile` | ✅ | nurse | Create nurse profile |
| GET | `/api/nurse/profile/:id` | ✅ | any | Get nurse profile by ID |
| GET | `/api/nurse/my-profile` | ✅ | nurse | Get own nurse profile |
| PUT | `/api/nurse/profile` | ✅ | nurse | Update nurse profile |
| GET | `/api/nurse/jobs` | ✅ | any | Browse approved nurses |

#### Create/Update Profile Body:
```json
{
  "specializations": ["General Care", "Elder Care"],
  "experience": 5,
  "bio": "Experienced nurse with ICU background",
  "documents": { "nursingCert": true, "idProof": true, "cvUploaded": true },
  "location": { "city": "Indore", "state": "MP", "pincode": "452001" },
  "hourlyRate": 500,
  "availability": true
}
```

---

### REQUESTS
| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/request` | ✅ | patient | Create service request |
| GET | `/api/request/patient` | ✅ | patient | Patient's own requests |
| GET | `/api/request/nurse` | ✅ | nurse | Nurse's assigned requests |
| PUT | `/api/request/:id/status` | ✅ | any | Update request status |

#### Create Request Body:
```json
{
  "mode": "temporary",
  "problem": "BP monitoring needed for elderly mother",
  "address": "123 Vijay Nagar",
  "city": "Indore",
  "patientAge": 68,
  "triageLevel": "medium",
  "amount": 500
}
```

---

### ADMIN
| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/admin/stats` | ✅ | admin | Dashboard stats from MongoDB |
| GET | `/api/admin/nurses` | ✅ | admin | All nurses (filter by status) |
| PUT | `/api/admin/nurse/:id/approve` | ✅ | admin | Approve nurse |
| PUT | `/api/admin/nurse/:id/reject` | ✅ | admin | Reject nurse |
| GET | `/api/admin/patients` | ✅ | admin | All patients |
| GET | `/api/admin/requests` | ✅ | admin | All requests |
| GET | `/api/admin/activity` | ✅ | admin | Recent activity log |

Query params: `?status=pending&page=1&limit=20`

---

### AI (Gemini)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/triage` | ✅ | Priya AI health companion (multi-turn) |
| POST | `/api/ai/interview` | ✅ | Nurse vetting interview |
| POST | `/api/ai/nurse-match` | ✅ | AI match patient to best nurse |

#### Triage Body:
```json
{
  "messages": [
    { "role": "user", "content": "Mujhe sar mein dard ho raha hai" }
  ],
  "language": "hi"
}
```

#### Interview Body:
```json
{
  "messages": [
    { "role": "assistant", "content": "What would you do if a patient's BP drops to 80/50?" },
    { "role": "user", "content": "I would immediately call the doctor and..." }
  ],
  "action": "continue"
}
```
Set `"action": "evaluate"` to get final JSON scoring.

#### Nurse Match Body:
```json
{
  "patientProblem": "Post-surgery wound care needed",
  "patientAge": 55,
  "nurseIds": ["optional-array-of-profile-ids"]
}
```

---

### EMAIL
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/email/send` | ✅ | Send email via Gmail SMTP |

#### Email Types:

**Nurse Approval:**
```json
{
  "type": "nurse_approval",
  "to": "nurse@example.com",
  "nurseName": "Priya Devi"
}
```

**Booking Confirmation to Nurses:**
```json
{
  "type": "booking_confirmation",
  "to": ["nurse1@example.com", "nurse2@example.com"],
  "patientName": "Riya Sharma",
  "phone": "9876543210",
  "address": "123 MG Road, Indore",
  "problem": "Blood sugar monitoring",
  "mode": "temporary"
}
```

---

## 📁 Project Structure

```
backend/
├── server.js                    # Entry point
├── package.json
├── .env.example
└── src/
    ├── config/
    │   └── db.js                # MongoDB connection
    ├── models/
    │   ├── User.js              # Patient/Nurse/Admin user
    │   ├── NurseProfile.js      # Nurse profile & status
    │   ├── Request.js           # Service requests
    │   └── Notification.js      # Activity log
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── nurse.controller.js
    │   ├── request.controller.js
    │   ├── admin.controller.js
    │   ├── ai.controller.js     # Gemini AI integration
    │   └── email.controller.js  # Nodemailer Gmail
    ├── routes/
    │   ├── auth.routes.js
    │   ├── nurse.routes.js
    │   ├── request.routes.js
    │   ├── admin.routes.js
    │   ├── ai.routes.js
    │   └── email.routes.js
    └── middleware/
        ├── auth.middleware.js   # JWT verification
        └── role.middleware.js   # Role-based access
```

---

## 🔐 Security Notes

- Passwords are hashed with **bcrypt** (12 salt rounds)
- JWT tokens expire in **30 days**
- Gemini API key is **never exposed to frontend** (server-side only)
- CORS configured to allow only `FRONTEND_URL`
- Role middleware prevents unauthorized access

---

## 🧪 Test with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@nurseconnect.com","password":"admin123","role":"admin"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nurseconnect.com","password":"admin123"}'

# Get stats (use token from login)
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
