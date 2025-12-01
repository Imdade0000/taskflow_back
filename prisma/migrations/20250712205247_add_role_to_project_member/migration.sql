-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `Task_timelineId_fkey`;

-- DropIndex
DROP INDEX `Task_timelineId_fkey` ON `task`;

-- AlterTable
ALTER TABLE `projectmember` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE `task` MODIFY `dueEnd` DATETIME(3) NULL,
    MODIFY `timelineId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_timelineId_fkey` FOREIGN KEY (`timelineId`) REFERENCES `Timeline`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
