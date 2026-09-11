ALTER TABLE "ShopPromotion" ADD COLUMN "targetCameraId" TEXT;

CREATE UNIQUE INDEX "ShopPromotion_targetCameraId_key" ON "ShopPromotion"("targetCameraId");

ALTER TABLE "ShopPromotion"
ADD CONSTRAINT "ShopPromotion_targetCameraId_fkey"
FOREIGN KEY ("targetCameraId") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;
