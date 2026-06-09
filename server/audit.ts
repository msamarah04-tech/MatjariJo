import type { User } from '@prisma/client';
import { prisma } from './db.js';
import { jsonDetail } from './serializers.js';

export async function getSettings() {
  return prisma.platformSettings.upsert({
    where: { id: 'platform' },
    update: {},
    create: {
      id: 'platform',
      categories: JSON.stringify(['Apparel', 'Home', 'Beauty', 'Food', 'Electronics']),
    },
  });
}

export type AuditOptions = {
  targetType?: string;
  targetId?: string;
  detail?: unknown;
  /** Security-relevant events are append-only and never pruned by auditCap. */
  security?: boolean;
  ip?: string;
};

export async function audit(user: User | null, action: string, target: string, options: AuditOptions = {}) {
  const settings = await getSettings();
  await prisma.auditLog.create({
    data: {
      actorId: user?.id,
      actorEmail: user?.email,
      actorName: user?.name,
      action,
      target,
      targetType: options.targetType,
      targetId: options.targetId,
      detail: jsonDetail(options.detail),
      security: options.security ?? false,
      ip: options.ip,
    },
  });

  // Append-only for security events: only non-security rows are ever pruned, and
  // only the overflow beyond auditCap. Security history is uncapped.
  const extra = await prisma.auditLog.findMany({
    where: { security: false },
    orderBy: { createdAt: 'desc' },
    skip: settings.auditCap,
    select: { id: true },
  });

  if (extra.length > 0) {
    await prisma.auditLog.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
  }
}

/** Convenience wrapper for security-relevant actions (login, password, credentials, bans). */
export function auditSecurity(user: User | null, action: string, target: string, options: Omit<AuditOptions, 'security'> = {}) {
  return audit(user, action, target, { ...options, security: true });
}
