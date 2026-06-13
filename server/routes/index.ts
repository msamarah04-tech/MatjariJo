import { Router } from 'express';
import { prisma } from '../db.js';
import { authRouter } from './auth.routes.js';
import { bootstrapRouter } from './bootstrap.routes.js';
import { storefrontRouter } from './storefront.routes.js';
import { platformRouter } from './platform.routes.js';
import { adminRouter } from './admin.routes.js';
import { uploadRouter } from './upload.routes.js';

/**
 * Composes the API surface from focused route modules. Each module owns its paths
 * and its own group middleware (platform/admin apply auth + password-rotation gates
 * internally), so mounting order here is just assembly.
 */
export const router = Router();

// Liveness: the process is up and serving.
router.get('/health', (_req, res) => res.json({ ok: true, status: 'live' }));

// Readiness: the process can reach its database. Returns 503 when it cannot, so a
// load balancer / orchestrator stops routing traffic until the DB is reachable.
router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ ok: true, status: 'ready' });
  } catch {
    res.status(503).json({ ok: false, status: 'not-ready' });
  }
});

router.use(authRouter);
router.use(bootstrapRouter);
router.use(storefrontRouter);
router.use(platformRouter);
router.use(adminRouter);
router.use(uploadRouter);
