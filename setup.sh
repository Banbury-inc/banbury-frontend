#!/bin/bash

# Print commands and exit on errors
set -ex

echo "🚀 Setting up Banbury development environment..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build packages in correct order
echo "Building and linking packages..."
npm run build --workspace=packages/core
npm run build --workspace=packages/api

# Always clean, build, and relink the CLI
npm run clean --workspace=packages/cli
npm run build --workspace=packages/cli

# Unlink any previous global and local CLI links
npm unlink -g @banbury/cli || true
npm unlink @banbury/cli || true

# Link CLI globally and locally
npm run link --workspace=packages/cli
npm link @banbury/cli

npm run build --workspace=packages/frontend

# Show CLI version for verification
banbury --version || true

echo "✨ Setup complete! You can now run 'npm run dev:all' to start development"

# Ask if they want to start development immediately
read -p "Would you like to start development now? (y/n) " -n 1 -r
echo    # Move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npm run dev:all
fi 