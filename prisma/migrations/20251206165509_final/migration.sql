/*
  Warnings:

  - You are about to drop the column `role` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `buyerId` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryId` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `sellerId` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `transporterId` on the `order` table. All the data in the column will be lost.
  - The values [PROCESSING,IN_TRANSIT,RETURNED] on the enum `Order_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdById` on the `product` table. All the data in the column will be lost.
  - The values [RETAILER] on the enum `RoleRequest_requestedRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `userrole` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[warehouseId,productId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `warehouseId` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transporter` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `inventory` DROP FOREIGN KEY `Inventory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_buyerId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_inventoryId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_sellerId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_transporterId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `userrole` DROP FOREIGN KEY `UserRole_userId_fkey`;

-- DropIndex
DROP INDEX `Inventory_userId_productId_role_key` ON `inventory`;

-- DropIndex
DROP INDEX `Order_buyerId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Order_inventoryId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Order_sellerId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Order_transporterId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Product_createdById_fkey` ON `product`;

-- AlterTable
ALTER TABLE `inventory` DROP COLUMN `role`,
    DROP COLUMN `userId`,
    ADD COLUMN `warehouseId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `buyerId`,
    DROP COLUMN `inventoryId`,
    DROP COLUMN `sellerId`,
    DROP COLUMN `transporterId`,
    ADD COLUMN `customerId` INTEGER NOT NULL,
    ADD COLUMN `orderHash` VARCHAR(64) NULL,
    ADD COLUMN `qrToken` TEXT NULL,
    ADD COLUMN `serverSignature` TEXT NULL,
    ADD COLUMN `signedAt` DATETIME(3) NULL,
    ADD COLUMN `supplierId` INTEGER NOT NULL,
    ADD COLUMN `supplierSignature` TEXT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'PENDING_REASSIGN', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `product` DROP COLUMN `createdById`,
    ADD COLUMN `supplierId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `rolerequest` ADD COLUMN `licenseNumber` VARCHAR(191) NULL,
    ADD COLUMN `serviceArea` VARCHAR(191) NULL,
    MODIFY `requestedRole` ENUM('ADMIN', 'SUPPLIER', 'DISTRIBUTOR', 'CUSTOMER') NOT NULL;

-- AlterTable
ALTER TABLE `trackingevent` ADD COLUMN `legId` INTEGER NULL;

-- AlterTable
ALTER TABLE `transporter` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `distributorId` INTEGER NULL,
    ADD COLUMN `supplierId` INTEGER NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `role` ENUM('ADMIN', 'SUPPLIER', 'DISTRIBUTOR', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER';

-- DropTable
DROP TABLE `userrole`;

-- CreateTable
CREATE TABLE `SupplierProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `businessAddress` VARCHAR(191) NOT NULL,
    `contactNumber` VARCHAR(191) NOT NULL,
    `NTN` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `publicKey` TEXT NULL,
    `privateKeyHash` VARCHAR(191) NULL,

    UNIQUE INDEX `SupplierProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warehouse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Main Warehouse',
    `address` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Warehouse_supplierId_key`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributorProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `businessAddress` VARCHAR(191) NOT NULL,
    `contactNumber` VARCHAR(191) NOT NULL,
    `NTN` VARCHAR(191) NULL,
    `serviceArea` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DistributorProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderLeg` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `legNumber` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `fromType` ENUM('SUPPLIER', 'DISTRIBUTOR', 'CUSTOMER') NOT NULL,
    `fromSupplierId` INTEGER NULL,
    `fromDistributorId` INTEGER NULL,
    `toType` ENUM('SUPPLIER', 'DISTRIBUTOR', 'CUSTOMER') NOT NULL,
    `toDistributorId` INTEGER NULL,
    `transporterId` INTEGER NULL,

    UNIQUE INDEX `OrderLeg_orderId_legNumber_key`(`orderId`, `legNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Inventory_warehouseId_productId_key` ON `Inventory`(`warehouseId`, `productId`);

-- AddForeignKey
ALTER TABLE `SupplierProfile` ADD CONSTRAINT `SupplierProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `SupplierProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorProfile` ADD CONSTRAINT `DistributorProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `SupplierProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `SupplierProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderLeg` ADD CONSTRAINT `OrderLeg_transporterId_fkey` FOREIGN KEY (`transporterId`) REFERENCES `Transporter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderLeg` ADD CONSTRAINT `OrderLeg_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderLeg` ADD CONSTRAINT `OrderLeg_fromSupplierId_fkey` FOREIGN KEY (`fromSupplierId`) REFERENCES `SupplierProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderLeg` ADD CONSTRAINT `OrderLeg_fromDistributorId_fkey` FOREIGN KEY (`fromDistributorId`) REFERENCES `DistributorProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderLeg` ADD CONSTRAINT `OrderLeg_toDistributorId_fkey` FOREIGN KEY (`toDistributorId`) REFERENCES `DistributorProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transporter` ADD CONSTRAINT `Transporter_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `SupplierProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transporter` ADD CONSTRAINT `Transporter_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `DistributorProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
