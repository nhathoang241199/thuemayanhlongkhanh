-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "expenseDate" TIMESTAMP(3);

UPDATE "Expense" SET "expenseDate" = "createdAt" WHERE "expenseDate" IS NULL;

ALTER TABLE "Expense" ALTER COLUMN "expenseDate" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");
