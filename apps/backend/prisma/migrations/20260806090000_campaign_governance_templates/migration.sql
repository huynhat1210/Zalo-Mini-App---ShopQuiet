ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "experimentKey" TEXT,
  ADD COLUMN IF NOT EXISTS "variantLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "dailyLimit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "quietHoursStart" INTEGER NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS "quietHoursEnd" INTEGER NOT NULL DEFAULT 7;

CREATE INDEX IF NOT EXISTS "Campaign_approvalStatus_idx" ON "Campaign"("approvalStatus");
CREATE INDEX IF NOT EXISTS "Campaign_experimentKey_idx" ON "Campaign"("experimentKey");

CREATE TABLE IF NOT EXISTS "CampaignHistory" (
  "id" SERIAL NOT NULL,
  "campaignId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignHistory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CampaignHistory_campaignId_createdAt_idx" ON "CampaignHistory"("campaignId", "createdAt");
CREATE INDEX IF NOT EXISTS "CampaignHistory_action_idx" ON "CampaignHistory"("action");

CREATE TABLE IF NOT EXISTS "CampaignTemplate" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "targetSegment" TEXT NOT NULL DEFAULT 'ALL',
  "content" TEXT NOT NULL,
  "voucherCode" TEXT,
  "bonusCoins" INTEGER NOT NULL DEFAULT 0,
  "discountPercent" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignTemplate_active_idx" ON "CampaignTemplate"("active");
CREATE INDEX IF NOT EXISTS "CampaignTemplate_type_idx" ON "CampaignTemplate"("type");
CREATE INDEX IF NOT EXISTS "CampaignTemplate_createdAt_idx" ON "CampaignTemplate"("createdAt");
