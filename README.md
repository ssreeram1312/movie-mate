# MovieMate 🍿

A full-stack, AI-powered personal tracker for movies and TV shows. MovieMate helps you manage your watchlist, track your viewing progress, visualize your watching habits, and uses advanced AI to recommend the perfect movie based on your schedule and mood!

## ✨ Features

- **Collection Management**: Add movies and TV shows, track your progress (episodes watched), and rate/review them.
- **TMDB Integration**: Instantly auto-fills posters, genres, directors, and runtimes by searching the TMDB database.
- **Advanced Dashboard**: Filter and sort your collection by platform (Netflix, Prime, etc.), genre, and status (watching, completed, wishlist).
- **AI Picks**: Google Gemini analyzes your watch history and generates highly personalized recommendations with natural language reasoning.
- **Watch Time Analytics**: Visualize your watch habits with beautiful interactive charts (powered by Recharts).
- **Watch Party Planner**: Input your friends' free time to calculate the overlapping window, and let the AI suggest the perfect movie that fits exactly within that time constraint!

## 🛠️ Tech Stack

- **Frontend**: React, Vite, React Router, Recharts, Vanilla CSS (Glassmorphism UI)
- **Backend**: Python, FastAPI, SQLAlchemy, Uvicorn
- **Database**: SQLite (Local) / PostgreSQL (Production)
- **Integrations**: TMDB API (Media Metadata), Google Gemini API (AI Recommendations)

## 🚀 Setup Instructions (Local Development)

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- TMDB API Key (v4 Auth)
- Google Gemini API Key

### 1. Backend Setup
Navigate to the backend directory and set up a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:
```env
TMDB_API_KEY=your_tmdb_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite:///./moviemate.db
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
*The API will be available at `http://localhost:8000`. You can view the auto-generated API docs at `http://localhost:8000/docs`.*

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*The app will be available at `http://localhost:5173`.*

## 🌍 Deployment Guide

### Backend (Render)
1. Push your code to a GitHub repository.
2. Log in to [Render](https://render.com/) and create a new **Web Service**.
3. Connect your repository and set the Root Directory to `backend`.
4. Set the Build Command to `pip install -r requirements.txt`.
5. Set the Start Command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add your Environment Variables: `TMDB_API_KEY`, `GEMINI_API_KEY`, and `DATABASE_URL` (You can create a free PostgreSQL database on Render and use its Internal URL here).

### Frontend (Vercel)
1. Log in to [Vercel](https://vercel.com/) and create a new **Project**.
2. Import your repository and set the Framework Preset to **Vite**.
3. Set the Root Directory to `frontend`.
4. Add an Environment Variable `VITE_API_URL` pointing to your deployed Render backend URL.
5. Deploy!

