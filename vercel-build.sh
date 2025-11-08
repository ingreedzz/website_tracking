#!/bin/bash

# Check for required environment variables
required_vars=(
  "SUPABASE_URL"
  "SUPABASE_KEY"
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "JWT_SECRET"
)

missing_vars=0
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    missing_vars=1
  else
    echo "✓ Found environment variable: $var"
  fi
done

if [ $missing_vars -eq 1 ]; then
  echo "Error: Missing required environment variables"
  exit 1
fi

echo "✓ All required environment variables are set"
# Prevent accidental embedding of a local API base in the client build.
# If VITE_API_URL is set to a localhost address in the build environment,
# unset it so the frontend will use a relative '/api' path.
if [ "${VITE_API_URL}" = "http://localhost:3000" ] || [ "${VITE_API_URL}" = "http://127.0.0.1:3000" ]; then
  echo "⚠️ VITE_API_URL points to localhost in build env — clearing to use relative paths"
  unset VITE_API_URL
fi

# Also guard against a committed .env file containing VITE_API_URL pointing to localhost
# Vite loads `.env` files at build time, so remove that line if present to avoid baking it in.
if [ -f .env ]; then
  if grep -q "^VITE_API_URL=.*localhost" .env; then
    echo "⚠️ .env contains VITE_API_URL pointing to localhost — removing that line for build"
    # keep a backup in case needed
    cp .env .env.vercel_build.bak || true
    # delete the VITE_API_URL line(s)
    sed -i '/^VITE_API_URL=/d' .env || true
  fi
fi

vite build