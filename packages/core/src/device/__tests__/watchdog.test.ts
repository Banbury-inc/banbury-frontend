import { fileWatcherEmitter } from '../watchdog';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { jest } from '@jest/globals';

describe('Watchdog Tests', () => {
  const testDir = path.join(os.tmpdir(), 'banbury-test');
  const testFile = path.join(testDir, 'test.txt');

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  test('detectFileChanges should be callable', () => {
    const { detectFileChanges } = require('../watchdog');
    
    // This test just verifies the function can be called without throwing
    expect(() => {
      detectFileChanges(testDir, 'test-user');
    }).not.toThrow();
  });
}); 
