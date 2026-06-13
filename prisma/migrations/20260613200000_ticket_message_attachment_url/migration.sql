-- Add attachmentUrl column to TicketMessage for support-chat file attachments
ALTER TABLE "TicketMessage" ADD COLUMN "attachmentUrl" TEXT;
