import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

// Import middleware
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import ticketsRoutes from './routes/tickets.routes';
import workersRoutes from './routes/workers.routes';
import tenantsRoutes from './routes/tenants.routes';
import paymentsRoutes from './routes/payments.routes';
import documentsRoutes from './routes/documents.routes';
import communityRoutes from './routes/community.routes';
import inspectionsRoutes from './routes/inspections.routes';
import notificationsRoutes from './routes/notifications.routes';
import analyticsRoutes from './routes/analytics.routes';
import unitsRoutes from './routes/units.routes';

// Environment variables are loaded in server.ts (tests set their own in tests/env.ts)

const app: Application = express();

// Behind a load balancer or reverse proxy (AWS ALB, nginx), every request seems to come from
// the proxy's IP, so all users would share ONE rate-limit counter. TRUST_PROXY is the number
// of proxies in front of the app; Express then reads the visitor's real IP from the
// X-Forwarded-For header. Leave it unset when nothing sits in front (as in local dev),
// otherwise anyone could fake their IP with that header.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  if (!Number.isInteger(hops) || hops < 1) {
    throw new Error(`TRUST_PROXY must be a whole number of proxies (like 1). Got "${process.env.TRUST_PROXY}".`);
  }
  app.set('trust proxy', hops);
}

// Create necessary directories
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
const logsDir = './logs';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'PropertyFlow API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/units', unitsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// The server is started in server.ts, so tests can import the app without opening a port
export default app;