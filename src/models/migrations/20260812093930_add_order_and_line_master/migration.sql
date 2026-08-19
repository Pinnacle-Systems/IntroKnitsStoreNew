-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "price" TEXT;

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "docId" TEXT,
    "description" TEXT,
    "active" BOOLEAN DEFAULT false,
    "branchId" INTEGER,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "active" BOOLEAN DEFAULT false,
    "branchId" INTEGER,

    CONSTRAINT "LineMaster_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineMaster" ADD CONSTRAINT "LineMaster_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
