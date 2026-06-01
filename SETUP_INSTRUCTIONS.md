# Manual Setup Instructions for AI Mock Interview Platform

## Prerequisites Installation

### 1. Install PostgreSQL (Required)

1. **Download**: https://www.postgresql.org/download/windows/
2. **Install**: Run the installer and follow these steps:
   - Set password for `postgres` user (e.g., `postgres123`)
   - Keep default port: `5432`
   - Install pgAdmin 4 (GUI tool)
   - Install Stack Builder (optional)

3. **Create Database**:
   ```bash
   # Open Command Prompt or PowerShell
   # Login to PostgreSQL
   psql -U postgres
   
   # Enter your postgres password when prompted
   # Then run these commands:
   CREATE DATABASE interview_platform;
   CREATE USER interview_user WITH PASSWORD 'interview_pass';
   GRANT ALL PRIVILEGES ON DATABASE interview_platform TO interview_user;
   \q
   ```

### 2. Install Redis (Required)

**Option A: Memurai (Recommended for Windows)**
- Website: https://www.memurai.com/get-memurai
- Free for development
- Runs as Windows service automatically

**Option B: Redis from Microsoft Archive**
- Download: https://github.com/microsoftarchive/redis/releases
- Get the latest .msi file
- Install and start the Redis service

**Verify Redis is running**:
```bash
redis-cli ping
# Should return: PONG
```

### 3. Configure Environment Variables

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** and update these values:
   ```env
   # Database - Update if you used different credentials
   DATABASE_URL=postgresql://interview_user:interview_pass@localhost:5432/interview_platform
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # JWT Secret - Generate a secure random string
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
   
   # OpenAI API Key - Get from https://platform.openai.com/api-keys
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   
   # Server
   PORT=3001
   NODE_ENV=development
   ```

3. **Copy backend environment**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with the same values as above
   ```

### 4. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 5. Run Database Migrations

```bash
# From the root directory
npm run migrate

# Or manually:
cd backend
npm run migrate
```

### 6. Start the Application

**Option A: Start Both Services Together**
```bash
# From root directory
npm run dev
```

**Option B: Start Services Separately**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Troubleshooting

### PostgreSQL Connection Issues

1. **Check if PostgreSQL is running**:
   ```bash
   # Windows Services
   services.msc
   # Look for "postgresql-x64-15" or similar
   ```

2. **Test connection**:
   ```bash
   psql -U interview_user -d interview_platform
   # Enter password: interview_pass
   ```

3. **Common fixes**:
   - Ensure PostgreSQL service is running
   - Check firewall settings
   - Verify DATABASE_URL in .env file

### Redis Connection Issues

1. **Check if Redis/Memurai is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Start Redis manually** (if using Microsoft Redis):
   ```bash
   redis-server
   ```

3. **Check Windows Services**:
   - Open `services.msc`
   - Look for "Redis" or "Memurai"
   - Ensure it's running

### Port Already in Use

If port 3001 or 3000 is already in use:

1. **Find process using the port**:
   ```bash
   netstat -ano | findstr :3001
   ```

2. **Kill the process**:
   ```bash
   taskkill /PID <process_id> /F
   ```

3. **Or change the port** in `.env`:
   ```env
   PORT=3002
   NEXT_PUBLIC_API_URL=http://localhost:3002
   ```

### OpenAI API Issues

1. **Get API Key**: https://platform.openai.com/api-keys
2. **Check billing**: Ensure you have credits
3. **Verify key** in `.env` file starts with `sk-`

## Next Steps

Once everything is running:

1. **Register an account**: http://localhost:3000/auth/register
2. **Login**: http://localhost:3000/auth/login
3. **Upload resume**: Go to interview setup
4. **Start mock interview**: Follow the guided flow

## Quick Test Without Full Setup

If you want to test the frontend UI without backend:

```bash
cd frontend
npm run dev
```

The UI will load but API calls will fail. This is useful for:
- Testing UI/UX
- Frontend development
- Design review
