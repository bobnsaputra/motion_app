# Stage Motion - Login System Setup Guide

## Prerequisites

Before you can use the login system, you need to install and configure PostgreSQL.

### Step 1: Install PostgreSQL

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. **Remember your password** for the `postgres` user
4. Default port is `5432` (keep this default)

### Step 2: Create the Database

After PostgreSQL is installed:

1. Open **pgAdmin** (installed with PostgreSQL) or **Command Prompt**
2. If using Command Prompt, connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
3. Create the database:
   ```sql
   CREATE DATABASE stage_motion;
   ```
4. Exit psql:
   ```sql
   \q
   ```

### Step 3: Configure Environment Variables

1. Open the `.env` file in your project root
2. Update the database password:
   ```env
   DB_PASSWORD=your_postgres_password_here
   ```
3. Make sure other settings match your PostgreSQL installation:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=stage_motion
   DB_USER=postgres
   ```

### Step 4: Initialize the Database Schema

Run the database setup script:

```bash
node server/database/setup.js
```

You should see: "✅ Database schema created successfully!"

### Step 5: Start the Application

Run both frontend and backend servers:

```bash
npm start
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Step 6: Test the Login

1. Open http://localhost:5173 in your browser
2. Click "Don't have an account? Sign up"
3. Register with:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
4. You'll be automatically logged in after registration
5. Try logging out and logging back in

## Troubleshooting

### "Connection failed" error
- Ensure PostgreSQL service is running
- Check your `.env` file has the correct password
- Verify the database `stage_motion` exists

### "Cannot connect to server"
- Make sure you ran `npm start` (not just `npm run dev`)
- Check if port 3001 is available
- Look for errors in the terminal

### Database connection errors
- Verify PostgreSQL is running (check Services on Windows)
- Confirm your PostgreSQL password in `.env` file
- Try connecting with pgAdmin to verify credentials

## Manual Server Commands

If you want to run servers separately:

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run dev
```

## Database Management

View your users in pgAdmin:
1. Open pgAdmin
2. Navigate to: Servers → PostgreSQL → Databases → stage_motion → Schemas → public → Tables → users
3. Right-click → View/Edit Data → All Rows

## Security Notes

⚠️ **Important for Production:**
- Change the `JWT_SECRET` in `.env` to a long random string
- Never commit `.env` file to version control (already in `.gitignore`)
- Use HTTPS in production
- Consider additional password requirements
- Implement rate limiting for login attempts
