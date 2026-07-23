-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "materialIssueItemsId" INTEGER,
ADD COLUMN     "materialReturnItemsId" INTEGER;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_materialIssueItemsId_fkey" FOREIGN KEY ("materialIssueItemsId") REFERENCES "MaterialIssueItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_materialReturnItemsId_fkey" FOREIGN KEY ("materialReturnItemsId") REFERENCES "MaterialReturnItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
