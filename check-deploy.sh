#!/bin/bash
# Quick check script to verify deployment setup

echo "🔍 Checking deployment setup..."

# Check if .git exists
if [ -d ".git" ]; then
  echo "⚠️  .git directory found (this is normal in CI/CD)"
  
  # Check for large pack files
  if find .git/objects/pack -name "*.pack" -size +20M 2>/dev/null | grep -q .; then
    echo "❌ WARNING: Large .git pack files found:"
    find .git/objects/pack -name "*.pack" -size +20M -exec ls -lh {} \;
    echo ""
    echo "💡 Solution: Use ./build-deploy.sh or ./deploy.sh to exclude .git"
  else
    echo "✓ No large pack files found"
  fi
else
  echo "✓ No .git directory (clean environment)"
fi

# Check if build script exists
if [ -f "build-deploy.sh" ]; then
  echo "✓ build-deploy.sh found"
else
  echo "❌ build-deploy.sh not found!"
fi

# Check if .wranglerignore exists
if [ -f ".wranglerignore" ]; then
  echo "✓ .wranglerignore found"
  if grep -q "\.git" .wranglerignore; then
    echo "✓ .git is in .wranglerignore"
  else
    echo "⚠️  .git not found in .wranglerignore"
  fi
else
  echo "⚠️  .wranglerignore not found"
fi

echo ""
echo "📋 Recommended deployment command:"
echo "   ./build-deploy.sh"
echo "   or"
echo "   ./deploy.sh"

