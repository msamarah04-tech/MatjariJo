import { app } from './app.js';
import { env } from './env.js';
import { configureSqlite } from './db.js';
import { logger } from './logger.js';

async function start() {
  await configureSqlite();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Plinth API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((error) => {
  logger.error({ err: error }, 'Failed to start Plinth API');
  process.exit(1);
});
