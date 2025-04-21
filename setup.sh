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
echo "🔨 Building packages..."
npm run build --workspace=packages/core
npm run build --workspace=packages/api
npm run build --workspace=packages/frontend

echo "✨ Setup complete! You can now run 'npm run dev:all' to start development"

# Ask if they want to start development immediately
read -p "Would you like to start development now? (y/n) " -n 1 -r
echo    # Move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npm run dev:all
fi 