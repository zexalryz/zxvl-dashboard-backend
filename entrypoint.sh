#!/bin/sh
set -e

if [ "$NODE_ENV" = "production" ]; then
  echo "Production mode — applying migrations..."
  npx prisma migrate deploy 2>&1
else
  echo "Development mode — pushing schema and seeding..."
  npx prisma db push --accept-data-loss 2>&1
  node prisma/seed.cjs 2>&1
fi

exec "$@"
