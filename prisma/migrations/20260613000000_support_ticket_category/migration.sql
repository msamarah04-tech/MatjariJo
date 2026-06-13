-- Add category column to SupportTicket (already applied via prisma db push; this records it in migration history)
ALTER TABLE "SupportTicket" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER';
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");
