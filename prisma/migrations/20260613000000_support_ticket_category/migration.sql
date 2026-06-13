-- Add category column to SupportTicket (already applied via prisma db push; this records it in migration history)
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'OTHER';
CREATE INDEX IF NOT EXISTS "SupportTicket_category_idx" ON "SupportTicket"("category");
