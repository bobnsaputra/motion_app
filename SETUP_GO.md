# Stage Motion - Go Backend Setup Guide

## Quick Start

Follow these steps to get your Go backend running:

### 1. Install Go

Download and install Go from: https://golang.org/dl/

Verify installation:
```bash
go version
```

### 2. Install PostgreSQL

Download from: https://www.postgresql.org/download/windows/

During installation:
- Remember your **password** for the postgres user
- Keep default port **5432**

### 3. Create Database

Open **Command Prompt** or **pgAdmin** and run:

```sql
CREATE DATABASE stage_motion;
```

### 4. Configure Environment

Edit `backend/.env` and set your PostgreSQL password:

```env
DB_PASSWORD=your_postgres_password_here
```

### 5. Install Go Dependencies

```bash
cd backend
go mod download
```

This will download:
- Gin web framework
- PostgreSQL driver (pgx)
- JWT library
- bcrypt for password hashing

### 6. Run the Backend

```bash
cd backend
go run main.go
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Database migrations completed
🚀 Server running on http://localhost:3001
```

### 7. Run the Frontend

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on: http://localhost:5173

### 8. Test the Application

1. Open http://localhost:5173 in your browser
2. You'll see the **Stage Motion** login page
3. Click "Don't have an account? Sign up"
4. Register a new account
5. You'll be automatically logged in

## Troubleshooting

### "go: command not found"
- Go is not installed or not in PATH
- Reinstall Go and restart your terminal

### "Cannot connect to database"
- PostgreSQL is not running (check Windows Services)
- Wrong password in `backend/.env`
- Database `stage_motion` doesn't exist

### "Port 3001 already in use"
- Another process is using port 3001
- Change PORT in `backend/.env` to 3002 (or any free port)
- Update `frontend/.env` VITE_API_URL accordingly

### Frontend can't connect to backend
- Make sure backend is running first
- Check that API URL in `frontend/.env` matches backend port
- Look for errors in browser console (F12)

## Building for Production

### Backend
```bash
cd backend
go build -o stage-motion-server.exe
```

This creates a single executable file you can deploy anywhere!

### Frontend
```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/`

## Development Tips

- **Hot Reload**: Frontend auto-reloads, but you need to restart Go backend for code changes
- **Database Changes**: Migrations run automatically when backend starts
- **View Database**: Use pgAdmin to view/edit data
- **API Testing**: Use Postman or curl to test endpoints directly

## Project Structure

```
new_project/
├── backend/          # Go server
│   ├── main.go
│   ├── handlers/     # API endpoints
│   ├── models/       # Database models
│   ├── middleware/   # Auth middleware
│   ├── database/     # DB connection
│   └── utils/        # JWT utilities
│
└── frontend/         # React app
    ├── src/
    ├── index.html
    └── package.json
```

## API Endpoints

Test with curl:

**Register:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"password123\"}"
```

## Next Steps

Once everything is running:
- Customize the JWT secret in `backend/.env`
- Add more features to your app
- Deploy to a server (backend Go binary + frontend static files)

Happy coding! 🚀
