-- CreateTable
CREATE TABLE "BookingTerms" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingTerms_pkey" PRIMARY KEY ("id")
);
