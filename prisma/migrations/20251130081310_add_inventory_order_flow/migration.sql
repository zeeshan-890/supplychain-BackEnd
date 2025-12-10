/*
  Warnings:

  - You are about to drop the column `customerId` on the `order` table. All the data in the column will be lost.
  - The values [SHIPPED] on the enum `Order_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `stock` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `trackingevent` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `trackingevent` table. All the data in the column will be lost.
  - You are about to drop the column `prevHash` on the `trackingevent` table. All the data in the column will be lost.
  - You are about to drop the column `shipmentId` on the `trackingevent` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `trackingevent` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `auditlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `supplier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `warehouse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `warehouseproduct` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `buyerId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventoryId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderId` to the `TrackingEvent` table without a default value. This is not possible if the table is not empty.
  - Made the column `password` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `shipment` DROP FOREIGN KEY `Shipment_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `shipment` DROP FOREIGN KEY `Shipment_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `trackingevent` DROP FOREIGN KEY `TrackingEvent_shipmentId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `warehouseproduct` DROP FOREIGN KEY `WarehouseProduct_productId_fkey`;

-- DropForeignKey
ALTER TABLE `warehouseproduct` DROP FOREIGN KEY `WarehouseProduct_warehouseId_fkey`;

-- DropIndex
DROP INDEX `Order_customerId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Product_supplierId_fkey` ON `product`;

-- DropIndex
DROP INDEX `TrackingEvent_shipmentId_fkey` ON `trackingevent`;

-- DropIndex
DROP INDEX `User_supplierId_key` ON `user`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `customerId`,
    ADD COLUMN `buyerId` INTEGER NOT NULL,
    ADD COLUMN `inventoryId` INTEGER NOT NULL,
    ADD COLUMN `sellerId` INTEGER NOT NULL,
    ADD COLUMN `transporterId` INTEGER NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `product` DROP COLUMN `stock`,
    DROP COLUMN `supplierId`,
    ADD COLUMN `createdById` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `trackingevent` DROP COLUMN `createdAt`,
    DROP COLUMN `hash`,
    DROP COLUMN `prevHash`,
    DROP COLUMN `shipmentId`,
    DROP COLUMN `verified`,
    ADD COLUMN `fromUserId` INTEGER NULL,
    ADD COLUMN `orderId` INTEGER NOT NULL,
    ADD COLUMN `toUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `supplierId`,
    MODIFY `password` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `auditlog`;

-- DropTable
DROP TABLE `shipment`;

-- DropTable
DROP TABLE `supplier`;

-- DropTable
DROP TABLE `warehouse`;

-- DropTable
DROP TABLE `warehouseproduct`;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `role` ENUM('ADMIN', 'SUPPLIER', 'DISTRIBUTOR', 'RETAILER', 'CUSTOMER') NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Inventory_userId_productId_role_key`(`userId`, `productId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transporter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `Inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_transporterId_fkey` FOREIGN KEY (`transporterId`) REFERENCES `Transporter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackingEvent` ADD CONSTRAINT `TrackingEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackingEvent` ADD CONSTRAINT `TrackingEvent_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackingEvent` ADD CONSTRAINT `TrackingEvent_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
