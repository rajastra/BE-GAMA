module.exports = {
   // Prevent console logging after tests
   setupFilesAfterEnv: ['./jest.setup.js'],
   
   // Ignore database connection logs
   testEnvironment: 'node',
   
   // Modify how tests are run
   verbose: false,
   
   // Prevent hanging tests
   testTimeout: 10000
 };