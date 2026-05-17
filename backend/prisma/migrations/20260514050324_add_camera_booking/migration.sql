-- CreateEnum
CREATE TYPE "CameraBrand" AS ENUM ('FUJIFILM', 'CANON', 'DJI');

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "brand" "CameraBrand" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dayPrice" INTEGER NOT NULL,
    "shiftPrice" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "tutorialVideoUrl" TEXT,
    "setupVideoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
