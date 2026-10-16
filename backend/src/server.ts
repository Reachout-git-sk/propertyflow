// Must be the first import: it reads .env into process.env before any other file
// (database.ts, config/jwt.ts) looks at process.env
import 'dotenv/config';
import app from './app';
import logger from './utils/logger';
import { SLAService } from './services/sla.service';

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start SLA monitoring
  const slaService = new SLAService();
  slaService.startSLAMonitoring();
  logger.info('✅ SLA monitoring started');
});
