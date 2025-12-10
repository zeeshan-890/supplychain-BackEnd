/*
  Warnings:

  - You are about to drop the column `location` on the `trackingevent` table. All the data in the column will be lost.
  - Added the required column `deliveryAddress` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `TrackingEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `order` ADD COLUMN `deliveryAddress` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `trackingevent` DROP COLUMN `location`,
    ADD COLUMN `status` VARCHAR(191) NOT NULL;
