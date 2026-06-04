-- CreateTable
CREATE TABLE "Lens" (
    "id" TEXT NOT NULL,
    "brand" "CameraBrand" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dayPrice" INTEGER NOT NULL,
    "shiftPrice" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lens_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "lensId" TEXT;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_lensId_fkey" FOREIGN KEY ("lensId") REFERENCES "Lens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
