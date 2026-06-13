-- Add ownerLastReadAt column to SupportTicket so the platform can track when a store owner last viewed a thread
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "ownerLastReadAt" TIMESTAMP(3);
