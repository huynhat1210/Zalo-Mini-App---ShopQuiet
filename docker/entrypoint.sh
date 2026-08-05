#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" -e 's/@127\.0\.0\.1:/@host.docker.internal:/; s/@localhost:/@host.docker.internal:/')"
fi
if [ -n "${DIRECT_URL:-}" ]; then
  export DIRECT_URL="$(printf '%s' "$DIRECT_URL" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" -e 's/@127\.0\.0\.1:/@host.docker.internal:/; s/@localhost:/@host.docker.internal:/')"
fi

exec "$@"
