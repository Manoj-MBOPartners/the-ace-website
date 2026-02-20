#!/bin/bash
# Cloudflare deployment script that excludes .git
# This replaces: rm -rf node_modules && set LOG=debug && npx wrangler deploy --assets=. --compatibility-date 2025-07-30
# 
# Usage: Update your Cloudflare deploy command to: ./deploy-cloudflare.sh

set -e

echo "=========================================="
echo "🚀 Cloudflare Deployment Script Starting"
echo "=========================================="

echo "🧹 Cleaning node_modules..."
rm -rf node_modules

echo "🔧 Setting up environment..."
export LOG=debug

# CRITICAL: Remove .git directory to prevent "Asset too large" errors
# Cloudflare clones the repo, creating .git with large pack files (62+ MiB)
if [ -d ".git" ]; then
  echo "⚠️  Removing .git directory (contains 62+ MiB pack files that exceed Cloudflare's 25 MiB limit)..."
  rm -rf .git
  echo "✓ .git directory removed"
fi

# Verify .git is gone
if [ -d ".git" ]; then
  echo "❌ ERROR: Failed to remove .git directory!"
  exit 1
fi

# Verify no large pack files remain
if find . -name "*.pack" -size +20M 2>/dev/null | grep -q .; then
  echo "❌ ERROR: Large pack files still found!"
  find . -name "*.pack" -size +20M
  exit 1
fi

echo "✓ Verified: .git excluded, no large pack files"

# Deploy
echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy --assets=. --compatibility-date 2025-07-30

echo "✅ Deployment complete!"

