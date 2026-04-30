import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`knowledge-base server listening on http://localhost:${env.PORT}`);
});
