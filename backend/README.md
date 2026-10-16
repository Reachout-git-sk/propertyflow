# PropertyFlow Backend API

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/propertyflow?schema=public"
APP_DATABASE_URL="postgresql://propertyflow_app:local-dev-only-password@localhost:5432/propertyflow?schema=public"
JWT_SECRET="<at least 32 random characters, see below>"
JWT_EXPIRES_IN="1h"
PORT=5000
NODE_ENV="development"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
FRONTEND_URL="http://localhost:5173"
```

Generate `JWT_SECRET` with the command below. The app refuses to start without a real secret.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Let the restricted app role (row-level security) log in
npm run db:app-role

# Seed database with initial data
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be running at `http://localhost:5000`

## Default Credentials

After seeding, you can login with:

- **Admin**: admin@propertyflow.com / Admin@123
- **Tenant**: tenant1@example.com / Tenant@123
- **Worker**: worker1@example.com / Worker@123

## API Documentation

### Authentication Endpoints

- `POST /api/auth/invites` - Admin only: approve an email for a role and get a one-time sign-up code (valid 7 days)
- `POST /api/auth/signup` - Register new user (needs `inviteCode` from an admin's invite)
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Ticket Endpoints

- `GET /api/tickets` - Get all tickets (filtered)
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket
- `POST /api/tickets/:id/assign` - Assign ticket to workers
- `PATCH /api/tickets/:id/status` - Update ticket status
- `POST /api/tickets/:id/attachments` - Upload attachment
- `GET /api/tickets/stats` - Get ticket statistics

### Worker Endpoints

- `GET /api/workers` - Get all workers
- `GET /api/workers/:id` - Get worker by ID
- `PATCH /api/workers/:id` - Update worker
- `GET /api/workers/:id/stats` - Get worker statistics

### Other Endpoints

See individual route files for complete documentation.

## Database Schema

Run `npm run prisma:studio` to open Prisma Studio and explore the database.

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── app.ts           # Main application file
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── uploads/             # File uploads (gitignored)
└── logs/                # Application logs (gitignored)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio
