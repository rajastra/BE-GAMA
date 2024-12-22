const sequelize = require('../utils/database');
const presensiController = require('../controllers/presensiController');
const Presensi = require('../models/presensiModel');
const AppError = require('../utils/appError');

jest.mock('../models/pegawaiModel');
jest.mock('../models/presensiModel');

beforeAll(async () => {
  await sequelize.sync({ force: false });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Presensi Controller', () => {
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
  });

  describe('Add presensi', () => {
    it('should create new presensi success', async () => {
      const presensiData = [
        {
          status: 'Hadir',
          tgl_absensi: '2024-11-24',
          pegawaiId: '123',
        },
      ];

      const mockPresensi = [
        {
          status: presensiData[0].status,
          tgl_absensi: presensiData[0].tgl_absensi,
          pegawaiId: presensiData[0].pegawaiId,
          id: 'presensi-id',
        },
      ];

      Presensi.findOne = jest.fn().mockResolvedValue(null);
      Presensi.bulkCreate = jest.fn().mockResolvedValue(mockPresensi);

      mockReq.body = presensiData;

      await presensiController.createPresensi(mockReq, mockRes, mockNext);

      expect(Presensi.findOne).toHaveBeenCalled();
      expect(Presensi.bulkCreate).toHaveBeenCalledWith(presensiData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          presensi: expect.arrayContaining([
            expect.objectContaining({
              status: 'Hadir',
              tgl_absensi: '2024-11-24',
              pegawaiId: '123',
            }),
          ]),
        },
      });
    });
    it('should return error if presensi already exists for the date', async () => {
      const presensiData = [
        {
          status: 'Hadir',
          tgl_absensi: '2024-11-24',
          pegawaiId: '123',
        },
      ];

      Presensi.findOne = jest.fn().mockResolvedValue({
        id: 'existing-id',
        status: 'Hadir',
        tgl_absensi: '2024-11-24',
        pegawaiId: '123',
      });

      mockReq.body = presensiData;

      await presensiController.createPresensi(mockReq, mockRes, mockNext);

      expect(Presensi.findOne).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));

      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Presensi for 2024-11-24 already exist');
      expect(error.statusCode).toBe(400);
    });
  });
});
