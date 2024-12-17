// Suppress console logs after tests
beforeAll(() => {
   jest.spyOn(console, 'log').mockImplementation(() => {});
   jest.spyOn(console, 'error').mockImplementation(() => {});
 });
 
 afterAll(() => {
   jest.restoreAllMocks();
 });