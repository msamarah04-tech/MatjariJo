-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'platform',
    "platformName" TEXT NOT NULL DEFAULT 'Matjari Jordan',
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
