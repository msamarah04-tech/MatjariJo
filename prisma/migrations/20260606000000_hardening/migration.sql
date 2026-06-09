-- Plinth hardening migration (Phases 1-3, 6 schema surface).
-- NOTE: Zod at the API boundary is the primary integrity guard. The CHECK
-- constraints below are defense-in-depth added for free while these tables are
-- rebuilt. Prisma cannot model CHECK constraints, so `prisma migrate diff` may
-- report them as drift; the project's single migration path is `migrate deploy`.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "security" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "actorEmail", "actorId", "actorName", "createdAt", "detail", "id", "target", "targetId", "targetType") SELECT "action", "actorEmail", "actorId", "actorName", "createdAt", "detail", "id", "target", "targetId", "targetType" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorEmail_idx" ON "AuditLog"("actorEmail");
CREATE INDEX "AuditLog_security_idx" ON "AuditLog"("security");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'JOD',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
    "discountCode" TEXT,
    "note" TEXT,
    "rejectionReason" TEXT,
    "idempotencyKey" TEXT,
    "invoiceNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_money_nonneg" CHECK (
      "subtotalCents" >= 0 AND "discountCents" >= 0 AND "taxCents" >= 0
      AND "shippingCents" >= 0 AND "totalCents" >= 0 AND "commissionCents" >= 0
    )
);
INSERT INTO "new_Order" ("createdAt", "customerEmail", "customerName", "customerPhone", "discountCents", "discountCode", "id", "note", "rejectionReason", "shippingAddress", "shippingCents", "status", "storeId", "subtotalCents", "totalCents", "updatedAt") SELECT "createdAt", "customerEmail", "customerName", "customerPhone", "discountCents", "discountCode", "id", "note", "rejectionReason", "shippingAddress", "shippingCents", "status", "storeId", "subtotalCents", "totalCents", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");
CREATE INDEX "Order_storeId_status_idx" ON "Order"("storeId", "status");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE UNIQUE INDEX "Order_storeId_idempotencyKey_key" ON "Order"("storeId", "idempotencyKey");
CREATE TABLE "new_PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'platform',
    "platformName" TEXT NOT NULL DEFAULT 'Plinth',
    "commissionRateBps" INTEGER NOT NULL DEFAULT 800,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'JOD',
    "categories" TEXT NOT NULL DEFAULT '["Apparel","Home","Beauty","Food","Electronics"]',
    "globalAnnouncement" TEXT NOT NULL DEFAULT '',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@example.com',
    "auditCap" INTEGER NOT NULL DEFAULT 500,
    "autoFlagThreshold" INTEGER NOT NULL DEFAULT 3,
    "taxRateBps" INTEGER NOT NULL DEFAULT 1600,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "taxLabel" TEXT NOT NULL DEFAULT 'GST',
    "lastSeenNotificationsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformSettings" ("auditCap", "autoFlagThreshold", "categories", "commissionRateBps", "createdAt", "defaultCurrency", "globalAnnouncement", "id", "lastSeenNotificationsAt", "maintenanceMode", "platformName", "supportEmail", "updatedAt") SELECT "auditCap", "autoFlagThreshold", "categories", "commissionRateBps", "createdAt", "defaultCurrency", "globalAnnouncement", "id", "lastSeenNotificationsAt", "maintenanceMode", "platformName", "supportEmail", "updatedAt" FROM "PlatformSettings";
DROP TABLE "PlatformSettings";
ALTER TABLE "new_PlatformSettings" RENAME TO "PlatformSettings";
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "logoUrl" TEXT,
    "logoEmoji" TEXT,
    "announcement" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "themeId" TEXT NOT NULL DEFAULT 'mono',
    "currency" TEXT NOT NULL DEFAULT 'JOD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "suspensionReason" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "commissionOverrideBps" INTEGER,
    "shippingType" TEXT NOT NULL DEFAULT 'FLAT',
    "shippingFlatCents" INTEGER,
    "freeOverCents" INTEGER,
    "taxRateBpsOverride" INTEGER,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "taxRegistrationNumber" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "nextInvoiceSeq" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Store_invoiceseq_positive" CHECK ("nextInvoiceSeq" >= 1)
);
INSERT INTO "new_Store" ("about", "announcement", "category", "commissionOverrideBps", "createdAt", "currency", "freeOverCents", "id", "internalNote", "isFeatured", "logoEmoji", "logoUrl", "name", "ownerId", "reviewStatus", "shippingFlatCents", "shippingType", "slug", "status", "suspensionReason", "tagline", "themeId", "updatedAt") SELECT "about", "announcement", "category", "commissionOverrideBps", "createdAt", "currency", "freeOverCents", "id", "internalNote", "isFeatured", "logoEmoji", "logoUrl", "name", "ownerId", "reviewStatus", "shippingFlatCents", "shippingType", "slug", "status", "suspensionReason", "tagline", "themeId", "updatedAt" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");
CREATE INDEX "Store_status_idx" ON "Store"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "ownerStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "passwordChangedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_counters_nonneg" CHECK ("tokenVersion" >= 0 AND "failedLoginCount" >= 0)
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "ownerStatus", "passwordHash", "role", "updatedAt", "username") SELECT "createdAt", "email", "id", "name", "ownerStatus", "passwordHash", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

