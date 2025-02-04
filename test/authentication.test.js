const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const sequelize = require('../utils/database');
const authController = require('../controllers/authController');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../models/userModel');

beforeAll(async () => {
  await sequelize.sync({ force: false });
});

afterAll(async () => {
  await sequelize.close();
});

describe('User Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Setup mock environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRE_IN = '1d';
  });

  describe('login', () => {
    it('should login user success with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword',
      };

      const mockUser = {
        id: 'user-id',
        email: loginData.email,
        matchPassword: jest.fn().mockResolvedValue(true),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const mockToken = 'fake-jwt-token';
      jwt.sign = jest.fn().mockReturnValue(mockToken);

      mockReq.body = loginData;

      await authController.login(mockReq, mockRes, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(mockUser.matchPassword).toHaveBeenCalledWith(loginData.password);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        token: mockToken,
        data: {
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
        },
      });
    });

    it('should handle login errors', async () => {
      mockReq.body = {};

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Mohon masukan email dan password anda',
          statusCode: 400,
        })
      );
    });

    it('should create a new user account', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword',
        role: 'admin',
        pegawaiId: '123',
      };

      const mockUser = {
        email: userData.email,
        password: userData.password,
        role: userData.role,
        pegawaiId: userData.pegawaiId,
        id: 'user-id',
        _id: 'user-id',
      };

      // Mock User.create and JWT sign
      User.create = jest.fn().mockResolvedValue(mockUser);

      // Mock token generation
      const mockToken = 'fake-jwt-token';
      jwt.sign = jest.fn().mockReturnValue(mockToken);

      // Set request body
      mockReq.body = userData;

      // Call signup method
      await authController.signup(mockReq, mockRes, mockNext);

      // Assertions
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user-id' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE_IN }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        token: mockToken,
        data: {
          user: expect.objectContaining({
            email: 'test@example.com',
            role: 'admin',
            pegawaiId: '123',
          }),
        },
      });
    });
  });
});
