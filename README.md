# SevaSetu

Home nursing platform MVP with patient, nurse, and admin flows.

## Structure

- `frontend/` - React + Vite + Tailwind app
- `backend/` - Node.js + Express + MongoDB API
- `docs/` - project and deployment documentation

## Local Development

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`

## Production Checklist

- Set `NODE_ENV=production`.
- Set a unique `JWT_SECRET` with at least 32 characters.
- Set `MONGODB_URI` to MongoDB Atlas or another managed MongoDB instance.
- Set `FRONTEND_URL` to the deployed frontend origin.
- Set `VITE_API_URL` in the frontend deployment to the backend URL.
- Keep `.env` files, API keys, uploaded medical files, and logs out of git.

See [docs/SevaSetu_Project_Documentation.md](docs/SevaSetu_Project_Documentation.md) for feature flows and deployment notes.
See [docs/Production_Readiness.md](docs/Production_Readiness.md) for the production-readiness boundary and external service list.
