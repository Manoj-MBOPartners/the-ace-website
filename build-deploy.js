#!/usr/bin/env node
// Build script for Cloudflare Workers deployment
// This script removes node_modules before deployment

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Preparing for deployment...');

// Remove node_modules if it exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('Removing node_modules...');
  try {
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('✓ node_modules removed');
  } catch (error) {
    console.warn('Warning: Could not remove node_modules:', error.message);
  }
}

// Check if .git exists and warn
const gitPath = path.join(__dirname, '.git');
if (fs.existsSync(gitPath)) {
  console.warn('⚠️  WARNING: .git directory detected!');
  console.warn('   Make sure .wranglerignore includes .git/ to avoid "Asset too large" errors');
  console.warn('   Consider using build-deploy.sh instead which explicitly excludes .git');
}

// Deploy (wrangler will use .wranglerignore to exclude .git)
console.log('Deploying to Cloudflare...');
console.log('Note: Ensure .wranglerignore properly excludes .git/ directory');
try {
  // Don't use --assets=. as it may bypass .wranglerignore
  // Instead, let wrangler auto-detect assets (it respects .wranglerignore)
  execSync('npx wrangler deploy --compatibility-date 2025-07-30', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✓ Deployment complete!');
} catch (error) {
  console.error('✘ Deployment failed');
  console.error('If you see "Asset too large" error, use build-deploy.sh instead');
  process.exit(1);
}

