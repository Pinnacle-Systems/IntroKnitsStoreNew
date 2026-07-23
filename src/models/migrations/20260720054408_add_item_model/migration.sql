-- AlterTable
ALTER TABLE "InwardItems" ADD COLUMN     "itemId" INTEGER;

-- AlterTable
ALTER TABLE "PurchaseReturnItems" ADD COLUMN     "itemId" INTEGER;

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "itemId" INTEGER;

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "aliasName" TEXT,
    "itemGroupId" INTEGER,
    "hsnId" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardItems" ADD CONSTRAINT "InwardItems_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItems" ADD CONSTRAINT "PurchaseReturnItems_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_itemGroupId_fkey" FOREIGN KEY ("itemGroupId") REFERENCES "ItemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "Hsn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
