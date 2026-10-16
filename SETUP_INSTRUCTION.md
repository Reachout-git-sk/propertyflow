# Complete Setup Instructions for Windows

## Step 1: Install Prerequisites

1. **Install Node.js 20 LTS**
   - Download from: https://nodejs.org/
   - Run installer and follow prompts
   - Verify: Open Command Prompt and run `node --version`

2. **Install PostgreSQL 15**
   - Download from: https://www.postgresql.org/download/windows/
   - During installation, remember your postgres password
   - Default port: 5432
   - Verify: Run `psql --version` in Command Prompt

3. **Install Git**
   - Download from: https://git-scm.com/download/win
   - Use default settings during installation

## Step 2: Setup Backend

```bash
# Open Command Prompt or PowerShell

# Navigate to backend folder
cd path\to\propertyflow\backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env file with Notepad
notepad .env
```

Update the DATABASE_URL and APP_DATABASE_URL in .env:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/propertyflow?schema=public"
APP_DATABASE_URL="postgresql://propertyflow_app:local-dev-only-password@localhost:5432/propertyflow?schema=public"
```

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Let the restricted app role (row-level security) log in
npm run db:app-role

# Seed database with sample data
npm run prisma:seed

# Start backend server
npm run dev
```

Backend should now be running on http://localhost:5000

## Step 3: Setup Frontend

Open a **NEW** Command Prompt window:

```bash
# Navigate to frontend folder
cd path\to\propertyflow\frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Start frontend server
npm run dev
```

Frontend should now be running on http://localhost:5173

## Step 4: Access the Application

1. Open browser and go to: http://localhost:5173
2. Login with default credentials:
   - Admin: admin@propertyflow.com / Admin@123
   - Tenant: tenant1@example.com / Tenant@123
   - Worker: worker1@example.com / Worker@123

## Troubleshooting

### Backend won't start

- Make sure PostgreSQL service is running
- Check DATABASE_URL in .env file
- Make sure port 5000 is not in use

### Frontend won't start

- Make sure backend is running first
- Check if port 5173 is available
- Clear npm cache: `npm cache clean --force`

### Database connection error

- Verify PostgreSQL is running: check Services (services.msc)
- Check username/password in .env
- Make sure database "propertyflow" exists

## Stopping the Servers

Press `Ctrl + C` in each Command Prompt window to stop the servers.

## Next Steps

1. Explore the tenant portal
2. Create test maintenance requests
3. Try the admin dashboard
4. Assign tickets to workers
5. View analytics

Enjoy using PropertyFlow! 🎉
