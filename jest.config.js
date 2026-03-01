export default {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json',
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'index.ts',
    '!**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};