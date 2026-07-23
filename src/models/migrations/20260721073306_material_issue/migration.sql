-- CreateTable
CREATE TABLE "MaterialIssue" (
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

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssueItems" (
    "id" SERIAL NOT NULL,
    "materialIssueId" INTEGER,
    "itemGroupId" INTEGER,
    "itemId" INTEGER,
    "sizeId" INTEGER,
    "colorId" INTEGER,
    "uomId" INTEGER,
    "hsnId" INTEGER,

    CONSTRAINT "MaterialIssueItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_itemGroupId_fkey" FOREIGN KEY ("itemGroupId") REFERENCES "ItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "Uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItems" ADD CONSTRAINT "MaterialIssueItems_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "Hsn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
