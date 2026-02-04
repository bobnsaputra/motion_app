# Stage Motion

A visual web-based tool for theatre directors, stage managers, and drama educators to plan character blocking and stage layouts.

## Project Structure

```
new_project/
├── backend/          # Go API server
│   ├── main.go      # Server entry point
│   ├── handlers/    # HTTP request handlers
│   ├── models/      # Data models
│   ├── database/    # PostgreSQL connection
│   ├── middleware/  # Auth middleware
│   └── utils/       # JWT utilities
│
└── frontend/        # React application
    ├── src/         # React components
    ├── public/      # Static assets
    └── index.html   # HTML entry point
```

## Prerequisites

- **Go** 1.21+ ([Download](https://golang.org/dl/))
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))

## Setup Instructions

### 1. Database Setup

Install PostgreSQL and create the database:

```bash
# Using psql
psql -U postgres
CREATE DATABASE stage_motion;
\q
```

### 2. Backend Setup (Go)

```bash
cd backend

# Install Go dependencies
go mod download

# Configure environment (edit backend/.env)
# Set your PostgreSQL password in DB_PASSWORD

# Run the server
go run main.go
```

The backend will:
- Connect to PostgreSQL
- Run database migrations automatically
- Start on http://localhost:3001

### 3. Frontend Setup (React)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on http://localhost:5173

## Environment Configuration

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stage_motion
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3001
JWT_SECRET=your-secret-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
```

## Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
go run main.go
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## Production Build

### Backend
```bash
cd backend
go build -o stage-motion-server
./stage-motion-server
```

### Frontend
```bash
cd frontend
npm run build
# Output will be in frontend/dist/
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/verify` | Verify JWT token |
| GET | `/api/health` | Health check |

## Features

### Authentication
- ✅ User registration with email validation
- ✅ Secure password hashing (bcrypt)
- ✅ JWT token authentication
- ✅ Session persistence
- ✅ Premium glassmorphism login UI

### Stage Blocking Tool
- Character management with visual representation
- Drag-and-drop positioning
- Direction and gaze controls
- Smart alignment guides
- Save/load layouts
- Export to JSON/PNG
- Undo/Redo system

## Technologies

**Backend:**
- Go 1.21
- Gin (web framework)
- PostgreSQL (database)
- pgx (PostgreSQL driver)
- JWT for authentication
- bcrypt for password hashing

**Frontend:**
- React 18
- TypeScript
- Vite
- HTML5 Canvas API

## License

[Specify your license here]

## Support

For issues or questions, please open an issue on GitHub.
