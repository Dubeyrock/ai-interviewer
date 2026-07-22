# AI Interviewer — Updated Project

## What is included
- Candidate intake form with resume upload.
- Resume parsing and domain/job-role fit scoring.
- AI interview question generation using Groq when available.
- Adaptive interview loop with answer evaluation.
- HR dashboard with selection / rejection view.
- PDF report generation.
- FastAPI backend + React/Vite frontend.

## Run backend
```bash
cd backend
python -m venv venv
# activate venv ( venv\Scripts\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
uvicorn app.main:app --reload --port 8001


```

## Run frontend
```bash)
cd frontend
npm install
npm run dev
```

## Environment variables
Create `backend/.env`:
```env
JWT_SECRET=change-me
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-70b-versatile
```

Optional frontend env:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```
