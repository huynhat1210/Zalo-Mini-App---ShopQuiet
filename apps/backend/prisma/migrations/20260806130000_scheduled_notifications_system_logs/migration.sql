ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SENT';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Notification_status_scheduledAt_idx" ON "Notification"("status", "scheduledAt");

CREATE TABLE IF NOT EXISTS "SystemLog" (
  "id" SERIAL NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'ERROR',
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "requestId" TEXT,
  "traceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SystemLog_level_createdAt_idx" ON "SystemLog"("level", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemLog_statusCode_createdAt_idx" ON "SystemLog"("statusCode", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemLog_path_createdAt_idx" ON "SystemLog"("path", "createdAt");
