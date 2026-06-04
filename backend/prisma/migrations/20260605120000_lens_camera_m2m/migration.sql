-- CreateTable
CREATE TABLE "CameraLens" (
    "cameraId" TEXT NOT NULL,
    "lensId" TEXT NOT NULL,

    CONSTRAINT "CameraLens_pkey" PRIMARY KEY ("cameraId","lensId")
);

-- CreateIndex
CREATE INDEX "CameraLens_lensId_idx" ON "CameraLens"("lensId");

-- AddForeignKey
ALTER TABLE "CameraLens" ADD CONSTRAINT "CameraLens_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraLens" ADD CONSTRAINT "CameraLens_lensId_fkey" FOREIGN KEY ("lensId") REFERENCES "Lens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Lens" DROP COLUMN "brand";
