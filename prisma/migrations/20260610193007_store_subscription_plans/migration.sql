-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'platform',
    "platformName" TEXT NOT NULL DEFAULT 'Plinth',
    "commissionRateBps" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_PlatformSettings" ("auditCap", "autoFlagThreshold", "categories", "commissionRateBps", "createdAt", "defaultCurrency", "globalAnnouncement", "id", "lastSeenNotificationsAt", "maintenanceMode", "platformName", "pricesIncludeTax", "supportEmail", "taxLabel", "taxRateBps", "updatedAt") SELECT "auditCap", "autoFlagThreshold", "categories", "commissionRateBps", "createdAt", "defaultCurrency", "globalAnnouncement", "id", "lastSeenNotificationsAt", "maintenanceMode", "platformName", "pricesIncludeTax", "supportEmail", "taxLabel", "taxRateBps", "updatedAt" FROM "PlatformSettings";
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
    "storefrontTemplate" TEXT NOT NULL DEFAULT 'editorial',
    "themeOverrides" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'JOD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "suspensionReason" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "commissionOverrideBps" INTEGER,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "planStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "planPaidUntil" DATETIME,
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
    CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Store" ("about", "address", "announcement", "category", "commissionOverrideBps", "contactPhone", "createdAt", "currency", "freeOverCents", "id", "internalNote", "isFeatured", "logoEmoji", "logoUrl", "name", "nextInvoiceSeq", "ownerId", "pricesIncludeTax", "reviewStatus", "shippingFlatCents", "shippingType", "slug", "status", "storefrontTemplate", "suspensionReason", "tagline", "taxRateBpsOverride", "taxRegistrationNumber", "themeId", "themeOverrides", "updatedAt") SELECT "about", "address", "announcement", "category", "commissionOverrideBps", "contactPhone", "createdAt", "currency", "freeOverCents", "id", "internalNote", "isFeatured", "logoEmoji", "logoUrl", "name", "nextInvoiceSeq", "ownerId", "pricesIncludeTax", "reviewStatus", "shippingFlatCents", "shippingType", "slug", "status", "storefrontTemplate", "suspensionReason", "tagline", "taxRateBpsOverride", "taxRegistrationNumber", "themeId", "themeOverrides", "updatedAt" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");
CREATE INDEX "Store_status_idx" ON "Store"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
