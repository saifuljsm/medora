-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dosageAdministration" TEXT,
ADD COLUMN     "indications" TEXT,
ADD COLUMN     "precautionsWarnings" TEXT,
ADD COLUMN     "sideEffects" TEXT;

-- CreateTable
CREATE TABLE "MedicineCategory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MedicineCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicineCategory_orgId_name_key" ON "MedicineCategory"("orgId", "name");

-- AddForeignKey
ALTER TABLE "MedicineCategory" ADD CONSTRAINT "MedicineCategory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
