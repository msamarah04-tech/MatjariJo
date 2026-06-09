ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantTitleSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantSkuSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantImageUrlSnapshot" TEXT;
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
