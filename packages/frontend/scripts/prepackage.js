#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Removing canvas dependency before packaging...');

// Remove canvas from node_modules
const canvasPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'canvas');

try {
  if (fs.existsSync(canvasPath)) {
    fs.rmSync(canvasPath, { recursive: true, force: true });
    console.log('Canvas dependency removed successfully');
  } else {
    console.log('Canvas dependency not found, skipping...');
  }
} catch (error) {
  console.warn('Warning: Could not remove canvas dependency:', error.message);
}

console.log('Pre-packaging complete'); 