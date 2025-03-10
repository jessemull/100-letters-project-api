module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore test paths you don’t want to run
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // Use the main tsconfig for the tests
    }],
  },
  collectCoverage: true,
  coverageDirectory: './coverage', // Coverage output directory
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/types/**'], // Collect coverage from all route files
};
