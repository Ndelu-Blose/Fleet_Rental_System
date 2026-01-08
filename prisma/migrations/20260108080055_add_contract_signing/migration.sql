-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

-- Add enum values first
ALTER TYPE "ContractStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ContractStatus" ADD VALUE 'SENT_TO_DRIVER';
ALTER TYPE "ContractStatus" ADD VALUE 'DRIVER_SIGNED';
ALTER TYPE "ContractStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ContractStatus" ADD VALUE 'EXPIRED';

-- AlterTable - Add new columns
ALTER TABLE "RentalContract" ADD COLUMN     "adminSignatureUrl" TEXT,
ADD COLUMN     "adminSignedAt" TIMESTAMP(3),
ADD COLUMN     "driverSignatureUrl" TEXT,
ADD COLUMN     "driverSignedAt" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "sentToDriverAt" TIMESTAMP(3),
ADD COLUMN     "signedPdfGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "signedPdfUrl" TEXT,
ADD COLUMN     "termsHash" TEXT,
ADD COLUMN     "termsText" TEXT,
ADD COLUMN     "termsVersion" TEXT NOT NULL DEFAULT 'v1';

-- Note: Default status change to DRAFT will be done in a follow-up migration
-- to avoid enum value usage before commit

-- CreateIndex
CREATE INDEX "RentalContract_status_idx" ON "RentalContract"("status");
