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
npm run build