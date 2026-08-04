-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_phone_idx";

-- DropIndex
DROP INDEX "Favorite_zaloUserId_idx";

-- DropIndex
DROP INDEX "CampaignUser_campaignId_idx";

-- DropIndex
DROP INDEX "MarketingListEntry_listId_idx";

-- AlterTable
ALTER TABLE "UserAddress" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "UserAddress" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productImageUrl" TEXT,
ADD COLUMN     "productName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserAddress_zaloUserId_idx" ON "UserAddress"("zaloUserId");

-- CreateIndex
CREATE INDEX "Order_zaloUserId_createdAt_idx" ON "Order"("zaloUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Notification_zaloUserId_read_createdAt_idx" ON "Notification"("zaloUserId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_zaloUserId_createdAt_idx" ON "ChatMessage"("zaloUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_zaloUserId_sender_read_idx" ON "ChatMessage"("zaloUserId", "sender", "read");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_zaloUserId_createdAt_idx" ON "AnalyticsEvent"("zaloUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Automation_trigger_enabled_priority_idx" ON "Automation"("trigger", "enabled", "priority");

-- CreateIndex
CREATE INDEX "AutomationLog_automationId_zaloUserId_status_idx" ON "AutomationLog"("automationId", "zaloUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingListEntry_listId_phone_key" ON "MarketingListEntry"("listId", "phone");

-- A user can have many addresses, but exactly one may be marked as default.
CREATE UNIQUE INDEX "UserAddress_one_default_per_user"
ON "UserAddress"("zaloUserId")
WHERE "isDefault" = true;
