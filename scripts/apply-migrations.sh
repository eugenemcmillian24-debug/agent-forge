#!/usr/bin/env bash
# Run this locally after: supabase login
# Requires: supabase CLI installed (npm install -g supabase)
set -e
PROJECT_REF="zdypvaxrhkzxrxhrntuh"
echo "Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF"
echo "Pushing migrations..."
supabase db push
echo "✅ Migrations applied"
