-- AlterTable
ALTER TABLE "MaterialIssueItems" ADD COLUMN     "inwardItemsId" INTEGER;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_inwardItemsId_fkey" FOREIGN KEY ("inwardItemsId") REFERENCES "InwardItems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
