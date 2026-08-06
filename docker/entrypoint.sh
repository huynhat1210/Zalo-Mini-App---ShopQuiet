#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" -e 's/@127\.0\.0\.1:/@host.docker.internal:/; s/@localhost:/@host.docker.internal:/')"
fi
if [ -n "${DIRECT_URL:-}" ]; then
  export DIRECT_URL="$(printf '%s' "$DIRECT_URL" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" -e 's/@127\.0\.0\.1:/@host.docker.internal:/; s/@localhost:/@host.docker.internal:/')"
fi

if [ "${RUN_DB_MIGRATIONS:-false}" = "true" ]; then
  migration_output=""
  if ! migration_output="$(./apps/backend/node_modules/.bin/prisma migrate deploy --schema=apps/backend/prisma/schema.prisma 2>&1)"; then
    printf '%s\n' "$migration_output"
    case "$migration_output" in
      *P3005*)
        echo "Existing database detected without Prisma migration history; syncing the current schema."
        ./apps/backend/node_modules/.bin/prisma db push --schema=apps/backend/prisma/schema.prisma --skip-generate
        ;;
      *)
        exit 1
        ;;
    esac
  else
    printf '%s\n' "$migration_output"
  fi
fi

exec "$@"
