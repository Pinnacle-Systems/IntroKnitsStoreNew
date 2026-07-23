-- AlterTable
ALTER TABLE "MaterialIssueItems" ADD COLUMN     "issueQty" TEXT;

-- CreateTable
CREATE TABLE "MaterialReturn" (
    "id" SERIAL NOT NULL,
    "docId" TEXT NOT NULL,
    "docDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "branchId" INTEGER,
    "supplierId" INTEGER,
    "locationId" INTEGER,
    "productionType" TEXT,

    CONSTRAINT "MaterialReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReturnItems" (
    "id" SERIAL NOT NULL,
    "materialReturnId" INTEGER,
    "itemGroupId" INTEGER,
    "itemId" INTEGER,
    "sizeId" INTEGER,
    "colorId" INTEGER,
    "uomId" INTEGER,
    "hsnId" INTEGER,
    "returnQty" TEXT,

    CONSTRAINT "MaterialReturnItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_materialReturnId_fkey" FOREIGN KEY ("materialReturnId") REFERENCES "MaterialReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_itemGroupId_fkey" FOREIGN KEY ("itemGroupId") REFERENCES "ItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "Uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnItems" ADD CONSTRAINT "MaterialReturnItems_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "Hsn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
