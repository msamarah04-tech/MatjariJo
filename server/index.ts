import { app } from './app.js';
import { env } from './env.js';
import { configureSqlite } from './db.js';
import { logger } from './logger.js';
import { initMonitoring } from './monitoring.js';

async function start() {
  initMonitoring();
  await configureSqlite();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Matjari API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((error) => {
  logger.error({ err: error }, 'Failed to start Matjari API');
  process.exit(1);
});
