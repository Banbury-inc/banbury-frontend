#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const canvasPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'canvas');

try {
  if (fs.existsSync(canvasPath)) {
    fs.rmSync(canvasPath, { recursive: true, force: true });
  }
} catch (error) {
  console.warn('Warning: Could not remove canvas dependency:', error);
}