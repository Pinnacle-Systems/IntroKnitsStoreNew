-- AlterTable
ALTER TABLE "MaterialReturnItems" ADD COLUMN     "materialIssueItemsId" INTEGER;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_materialIssueItemsId_fkey" FOREIGN KEY ("materialIssueItemsId") REFERENCES "MaterialIssueItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
