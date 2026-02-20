#!/bin/bash
# Safe deployment script that excludes .git directory
# This prevents "Asset too large" errors from .git/objects/pack files
# 
# This script uses build-deploy.sh which copies files to a clean directory
# excluding .git before deploying

set -e

echo "🚀 Starting Cloudflare Workers deployment..."

# Always use build-deploy.sh to ensure .git is excluded
# This is the safest method, especially in CI/CD environments
echo "Using build directory method to exclude .git..."
./build-deploy.sh

echo "✅ Deployment complete!"

