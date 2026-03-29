#!/bin/bash

# Fix Node Modules and NPM Packages Script
# This script will clean and reinstall all dependencies

echo "🔧 Fixing Node Modules and NPM Packages..."
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")"

# Remove node_modules and package-lock.json
echo "📦 Removing old node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Verify installation
echo ""
echo "✅ Verification:"
npm list --depth=0

echo ""
echo "✨ Done! All dependencies have been reinstalled."
echo ""
echo "To start the app, run: npm start"

