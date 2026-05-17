-- Align DB defaults with Prisma (@updatedAt + array default managed by client)
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "verificationImageUrls" DROP DEFAULT;
