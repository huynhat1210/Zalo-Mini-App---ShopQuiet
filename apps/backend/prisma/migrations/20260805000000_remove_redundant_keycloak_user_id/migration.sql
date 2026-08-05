-- AuthIdentity is the canonical mapping between an application user and an
-- external identity provider. User.keycloakUserId duplicated that mapping.
DROP INDEX IF EXISTS "User_keycloakUserId_key";
DROP INDEX IF EXISTS "User_keycloakUserId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "keycloakUserId";
CREATE UNIQUE INDEX IF NOT EXISTS "AuthIdentity_zaloUserId_provider_key"
  ON "AuthIdentity" ("zaloUserId", "provider");
