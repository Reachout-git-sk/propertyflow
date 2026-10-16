# 🔧 PropertyFlow - Detailed Setup Guide

## System Requirements

- **OS:** Windows 10/11, macOS, or Linux
- **Node.js:** v20.x or higher
- **PostgreSQL:** v15.x or higher
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 2GB free space

## Step-by-Step Installation

### 1️⃣ Install Prerequisites

#### Install Node.js

1. Download from https://nodejs.org/
2. Choose "LTS" version
3. Run installer with default settings
4. Verify: `node --version` (should show v20.x.x)

#### Install PostgreSQL

1. Download from https://www.postgresql.org/download/
2. During installation:
   - **Remember your postgres password!**
   - Default port: 5432
   - Install all components
3. Verify: `psql --version`

#### Install Git

1. Download from https://git-scm.com/
2. Install with default settings

### 2️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/propertyflow.git
cd propertyflow
```

### 3️⃣ Backend Configuration

```bash
cd backend

# Install dependencies (takes 2-3 minutes)
npm install

# Create environment file
cp .env.example .env
```

**Edit `backend/.env`:**

Open `.env` in notepad and update these values:

```env
# Replace YOUR_PASSWORD with your PostgreSQL password (owner: used by migrations and the seed)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/propertyflow?schema=public"

# The app itself connects as a restricted role, so row-level security applies
APP_DATABASE_URL="postgresql://propertyflow_app:local-dev-only-password@localhost:5432/propertyflow?schema=public"

# Required: at least 32 random characters (generate one with the command below)
JWT_SECRET="<paste the generated secret here>"
```

**Generate the JWT secret (required):**

The backend refuses to start if `JWT_SECRET` is missing, shorter than 32 characters,
or one of the example values. This uses a cryptographically secure random generator:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4️⃣ Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Create database and tables
npx prisma migrate dev

# Let the restricted app role log in (password from APP_DATABASE_URL)
npm run db:app-role

# Load sample data (admin, tenants, units)
npx prisma db seed
```

**Expected output:**

```
🌱 Starting seed...
✅ Admin user created: admin@propertyflow.com
✅ Property created: Sunset Apartments
✅ 3 units created
✅ Sample tenant created: tenant1@example.com
✅ Sample worker created: worker1@example.com
🎉 Seed completed successfully!
```

### 5️⃣ Start Backend

```bash
npm run dev
```

**Expected output:**

```
🚀 Server is running on port 5000
📝 Environment: development
✅ SLA monitoring started
```

**Verify:** Open http://localhost:5000/health in browser

### 6️⃣ Frontend Configuration

**Open a NEW terminal:**

```bash
cd frontend

# Install dependencies (takes 3-4 minutes)
npm install

# Create environment file
cp .env.example .env

# Edit if needed (default is fine for local)
```

### 7️⃣ Start Frontend

```bash
npm run dev
```

**Expected output:**

```
VITE ready in 500 ms
➜  Local: http://localhost:5173/
```

### 8️⃣ Access Application

**Open browser:** http://localhost:5173

**Login with:**

- Admin: admin@propertyflow.com / Admin@123

## 🎉 Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can access login page
- [ ] Can login as admin
- [ ] Can see admin dashboard

## Common Issues

### "Port already in use"

**Kill existing Node processes:**

```powershell
taskkill /F /IM node.exe
```

### "Database connection error"

1. Check PostgreSQL service is running
2. Verify DATABASE_URL in `.env`
3. Confirm password is correct

### "Prisma generate fails"

```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### "Cannot find module"

```bash
npm install
```

## Next Steps

1. Change default passwords
2. Add your own tenants
3. Explore admin features
4. Create maintenance tickets
5. Assign work to workers

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deploying to:

- Railway + Vercel
- Render
- Docker (self-hosted)

## Need Help?

Open an issue on GitHub: https://github.com/YOUR_USERNAME/propertyflow/issues

```

---

## 📄 STEP 5: CREATE LICENSE

Create `D:\projects\PropertyFlow\LICENSE`:
```

MIT License

Copyright (c) 2026 PropertyFlow Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
