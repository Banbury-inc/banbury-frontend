module.exports = {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'e2e',
    '.e2e.',
    'packages/frontend/tests/e2e'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@banbury/core$': '<rootDir>/packages/core/src'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/packages/core/tsconfig.test.json'
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: [
    '<rootDir>/packages/frontend/src',
    '<rootDir>/packages/core/src'
  ],
  modulePaths: [
    '<rootDir>/packages/frontend/src',
    '<rootDir>/packages/core/src'
  ],
  testMatch: [
    '<rootDir>/packages/**/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/packages/**/src/**/*.(spec|test).[jt]s?(x)',
    '!<rootDir>/**/e2e/**/*'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!axios)/'
  ],
  silent: true,
  errorOnDeprecated: false
};
