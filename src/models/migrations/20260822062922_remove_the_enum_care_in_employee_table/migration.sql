/*
  Warnings:

  - The `gender` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `maritalStatus` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `bloodGroup` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "gender",
ADD COLUMN     "gender" TEXT,
DROP COLUMN "maritalStatus",
ADD COLUMN     "maritalStatus" TEXT,
DROP COLUMN "bloodGroup",
ADD COLUMN     "bloodGroup" TEXT;
