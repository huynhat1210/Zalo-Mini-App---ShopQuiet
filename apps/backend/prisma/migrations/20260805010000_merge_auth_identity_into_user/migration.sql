-- Move the external login mapping onto User. Keycloak remains an internal
-- token broker and is stored separately from the real platform provider.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "provider" "AuthProvider" NOT NULL DEFAULT 'ZALO',
  ADD COLUMN IF NOT EXISTS "providerSubject" TEXT,
  ADD COLUMN IF NOT EXISTS "keycloakUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerVerifiedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF to_regclass('"AuthIdentity"') IS NOT NULL THEN
    UPDATE "User" u
    SET "providerSubject" = i."providerSubject",
        "provider" = i."provider",
        "providerVerifiedAt" = i."verifiedAt"
    FROM "AuthIdentity" i
    WHERE i."zaloUserId" = u."zaloId"
      AND i."provider" IN ('ZALO', 'GOOGLE', 'FACEBOOK', 'EMAIL')
      AND u."providerSubject" IS NULL;

    UPDATE "User" u
    SET "keycloakUserId" = i."providerSubject"
    FROM "AuthIdentity" i
    WHERE i."zaloUserId" = u."zaloId"
      AND i."provider" = 'KEYCLOAK'
      AND u."keycloakUserId" IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_providerSubject_key"
  ON "User" ("providerSubject");
CREATE UNIQUE INDEX IF NOT EXISTS "User_keycloakUserId_key"
  ON "User" ("keycloakUserId");

DROP TABLE IF EXISTS "AuthIdentity";
