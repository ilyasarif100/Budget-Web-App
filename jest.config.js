module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/',
    '/scripts/'
  ],
  
  // Module paths
  modulePaths: ['<rootDir>'],
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Transform configuration (for future TypeScript support)
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout
  testTimeout: 10000
};

