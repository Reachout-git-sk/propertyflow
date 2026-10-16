# 🏢 PropertyFlow - Complete Apartment Management System

> A modern, full-stack property management platform with ServiceNow-style ticketing, built with 100% free and open-source technologies.

[![CI](https://github.com/Reachout-git-sk/propertyflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Reachout-git-sk/propertyflow/actions/workflows/ci.yml)
![PropertyFlow](https://img.shields.io/badge/License-MIT-blue.svg)
![Node](https://img.shields.io/badge/Node.js-22-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

## ✨ Features

### For Property Managers (Admin)

- 📊 **Real-time Dashboard** - Overview of properties, tenants, and tickets
- 👥 **Tenant Management** - Add, edit, delete tenants with password control
- 👷 **Worker Management** - Manage maintenance workers and contractors
- 🎫 **Ticket System** - ServiceNow-style work order management
- 📈 **Analytics** - Performance metrics and reports
- 🔐 **Full Access Control** - Manage all aspects of the system

### For Tenants

- 📝 **Submit Requests** - Report maintenance issues easily
- 📸 **Upload Media** - Attach photos/videos to requests
- 📊 **Track Status** - Real-time updates on your requests
- 💬 **Communication** - Direct messaging with management
- 🔔 **Notifications** - Stay updated on ticket progress

### For Workers/Contractors

- 📋 **View Assignments** - See all assigned work orders
- ✅ **Update Status** - Mark tickets as in-progress or completed
- 📝 **Add Notes** - Document work performed
- ⭐ **Performance Tracking** - View your ratings and stats

## 🛠️ Technology Stack

**Backend:**

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT Authentication
- Multer (File uploads)
- Winston (Logging)

**Frontend:**

- React 18 + TypeScript + Vite
- TailwindCSS
- TanStack Query (React Query)
- Zustand (State management)
- React Router v6

**Infrastructure:**

- Docker support
- GitHub Actions ready
- Self-hosted or cloud deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ ([Download](https://nodejs.org/))
- PostgreSQL 15+ ([Download](https://www.postgresql.org/download/))
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/propertyflow.git
cd propertyflow
```

**2. Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and add your database credentials and JWT secret

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Let the restricted app role (row-level security) log in
npm run db:app-role

# Seed database
npx prisma db seed

# Start backend
npm run dev
```

Backend runs at: **http://localhost:5000**

**3. Frontend Setup**

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit if needed (default is fine for local development)

# Start frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

**4. Access the Application**

Open browser: **http://localhost:5173**

## 🧪 Running the Tests

The backend tests use a separate database, `propertyflow_test`, on the same PostgreSQL.
It is wiped and rebuilt from the migrations on every run, so your dev data is never touched.

```bash
docker compose up -d postgres
cd backend
npm test
```

The same tests run on GitHub Actions for every push and pull request
(see [.github/workflows/ci.yml](./.github/workflows/ci.yml)).

## 🔐 Default Credentials

After seeding the database:

| Role   | Email                  | Password   |
| ------ | ---------------------- | ---------- |
| Admin  | admin@propertyflow.com | Admin@123  |
| Tenant | tenant1@example.com    | Tenant@123 |
| Worker | worker1@example.com    | Worker@123 |

**⚠️ CHANGE THESE IN PRODUCTION!**

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed installation steps
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [API Documentation](./backend/README.md) - Backend API docs
- [Contributing](./CONTRIBUTING.md) - How to contribute

## 🔒 Security

- ✅ Email whitelist system
- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Role-based access control (RBAC)
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection (Helmet)
- ✅ Rate limiting
- ✅ Audit logging

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## 📧 Support

- 🐛 [Report Bug](https://github.com/YOUR_USERNAME/propertyflow/issues)
- 💡 [Request Feature](https://github.com/YOUR_USERNAME/propertyflow/issues)
- 📖 [Documentation](https://github.com/YOUR_USERNAME/propertyflow/wiki)

---

**Built with ❤️ using 100% free and open-source technologies**

⭐ Star this repo if you find it useful!
