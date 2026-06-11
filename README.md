# FamilySphere 🌐

A full-stack family social platform with real-time chat, memories, location sharing, and an AI assistant.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, Socket.io-client, Leaflet |
| Backend  | Node.js, Express, Socket.io, Sequelize |
| Database | SQLite (dev) / PostgreSQL (prod)    |
| Mobile   | Capacitor (Android)                 |
| Auth     | JWT + bcrypt                        |
| AI       | Google Gemini API (optional)        |

---

## Prerequisites

Make sure these are installed before running the project:

- **Node.js** v18+  → https://nodejs.org
- **npm** v9+       → comes with Node.js
- **Git** v2+       → https://git-scm.com

---

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/shubhamsirse507-jpg/-familysphere.git
cd -familysphere
```

### 2. Run the setup script (first time only)
```powershell
.\setup.ps1
```
This will:
- Verify your Node.js / Git / npm installation
- Set up your Git identity
- Create `backend/.env` from template
- Install all dependencies (root + backend + frontend workspaces)

### 3. Configure environment
Edit `backend/.env`:
```env
PORT=5000
JWT_SECRET=your_strong_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here   # optional
```

### 4. Seed the database
```bash
npm run seed
```

### 5. Start development servers

**Option A — both at once (single terminal):**
```bash
npm run dev
```

**Option B — two separate windows:**
```powershell
.\dev.ps1
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:5000   |

---

## Project Structure

```
familysphere/
├── backend/
│   ├── src/
│   │   ├── app.js          # Express + Socket.io entry
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # Sequelize ORM models
│   │   ├── routes/         # API route definitions
│   │   ├── middleware/     # Auth, upload middleware
│   │   └── seed.js         # Database seeder
│   ├── public/             # Served static files & uploads
│   ├── .env                # ⚠️ Secret — never commit
│   └── .env.example        # ✅ Template — safe to commit
├── frontend/
│   ├── src/                # React components & pages
│   ├── public/             # Static assets
│   └── vite.config.js      # Vite + proxy config
├── setup.ps1               # First-time setup script
├── dev.ps1                 # Quick dev launcher
├── package.json            # Root workspace config
└── .gitignore
```

---

## npm Scripts

| Command                 | Description                              |
|-------------------------|------------------------------------------|
| `npm run dev`           | Start backend + frontend concurrently    |
| `npm run dev-backend`   | Start backend only (port 5000)           |
| `npm run dev-frontend`  | Start frontend only (port 3000)          |
| `npm run seed`          | Seed the database with initial data      |
| `npm install`           | Install all workspace dependencies       |

---

## Git Workflow

```bash
# Check status
git status

# Stage and commit
git add .
git commit -m "feat: describe your change"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create a feature branch
git checkout -b feature/my-feature

# Merge back to main
git checkout main
git merge feature/my-feature
```

### Commit Message Convention

| Prefix    | Use for                          |
|-----------|----------------------------------|
| `feat:`   | New feature                      |
| `fix:`    | Bug fix                          |
| `chore:`  | Build / tooling changes          |
| `docs:`   | Documentation                    |
| `style:`  | Formatting (no logic change)     |
| `refactor:` | Code restructuring             |

---

## GitHub Repository

🔗 https://github.com/shubhamsirse507-jpg/-familysphere

---

## Environment Variables Reference

| Variable        | Required | Description                        |
|-----------------|----------|------------------------------------|
| `PORT`          | Yes      | Backend server port (default 5000) |
| `JWT_SECRET`    | Yes      | Secret key for JWT tokens          |
| `GEMINI_API_KEY`| No       | Google Gemini AI API key           |
