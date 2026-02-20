#!/bin/bash
# Build script for Cloudflare Workers deployment
# This script prepares assets excluding node_modules

set -e

echo "Cleaning previous build..."
rm -rf .wrangler-build

echo "Creating build directory..."
mkdir -p .wrangler-build

echo "Copying assets (excluding node_modules and .git)..."
# Copy all files except node_modules and .git (CRITICAL: .git causes "Asset too large" errors)
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='.git/**' \
          --exclude='.wrangler' \
          --exclude='.wrangler-build' \
          --exclude='package-lock.json' \
          --exclude='*.log' \
          --exclude='.DS_Store' \
          --exclude='.env*' \
          --exclude='.vscode' \
          --exclude='.idea' \
          --exclude='*.md' \
          --exclude='docs/' \
          ./ .wrangler-build/

# Verify .git is NOT in build directory (safety check)
if [ -d ".wrangler-build/.git" ]; then
  echo "❌ ERROR: .git directory found in build directory! Removing it..."
  rm -rf .wrangler-build/.git
fi

# Verify no large .git pack files
if find .wrangler-build -name "*.pack" -size +20M 2>/dev/null | grep -q .; then
  echo "❌ ERROR: Large pack files found in build directory!"
  find .wrangler-build -name "*.pack" -size +20M
  exit 1
fi

echo "✓ Build directory verified - .git excluded"

echo "Deploying from build directory..."
cd .wrangler-build
npx wrangler deploy --assets=. --compatibility-date 2025-07-30

echo "Deployment complete!"

