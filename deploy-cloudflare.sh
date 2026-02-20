#!/bin/bash
# Cloudflare deployment script that excludes .git
# This replaces: rm -rf node_modules && set LOG=debug && npx wrangler deploy --assets=. --compatibility-date 2025-07-30
# 
# Usage: Update your Cloudflare build command to: ./deploy-cloudflare.sh

set -e

echo "🧹 Cleaning node_modules..."
rm -rf node_modules

echo "🔧 Setting up environment..."
export LOG=debug

# Use build script which creates clean directory without .git
echo "🚀 Building and deploying to Cloudflare Workers..."
echo "   (This will exclude .git directory to prevent 'Asset too large' errors)"

# Make sure build script is executable
chmod +x build-deploy.sh

# Run the build script
./build-deploy.sh

echo "✅ Deployment complete!"

