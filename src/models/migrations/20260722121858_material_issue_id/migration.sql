-- AlterTable
ALTER TABLE "MaterialReturn" ADD COLUMN     "materialIssueId" INTEGER;

-- AlterTable
ALTER TABLE "MaterialReturnItems" ADD COLUMN     "materialIssueId" INTEGER;

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
