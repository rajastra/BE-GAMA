const sequelize = require('../utils/database');
const presensiController = require('../controllers/presensiController');
const Presensi = require('../models/presensiModel');
const Pegawai = require('../models/pegawaiModel');
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
    jest.clearAllMocks();

    mockReq = {
      body: {
        pegawaiId: 'test-uuid',
        tgl_absensi: '2025-01-02',
        lampiran: 'base64-signature-data',
        status: 'Hadir',
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('Add presensi', () => {
    it('should create new presensi success', async () => {
      Pegawai.findByPk.mockResolvedValue({
        id: 'test-uuid',
        nama: 'Test Employee',
      });

      Presensi.findOne.mockResolvedValue(null);

      const mockPresensi = {
        id: 'new-uuid',
        pegawaiId: 'test-uuid',
        tgl_absensi: new Date('2025-01-02'),
        lampiran: 'base64-signature-data',
        status: 'Hadir',
      };
      Presensi.create.mockResolvedValue(mockPresensi);

      // Execute the function
      await presensiController.createPresensi(mockReq, mockRes, mockNext);

      expect(Pegawai.findByPk).toHaveBeenCalledWith('test-uuid');
      expect(Presensi.findOne).toHaveBeenCalledWith({
        where: {
          pegawaiId: 'test-uuid',
          tgl_absensi: new Date('2025-01-02'),
        },
      });
      expect(Presensi.create).toHaveBeenCalledWith({
        pegawaiId: 'test-uuid',
        tgl_absensi: new Date('2025-01-02'),
        lampiran: 'base64-signature-data',
        status: 'Hadir',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          presensi: mockPresensi,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should return error if presensi already exists for the date', async () => {
      Pegawai.findByPk.mockResolvedValue({
        id: 'test-uuid',
        nama: 'Test Employee',
      });

      // Mock existing presensi
      Presensi.findOne.mockResolvedValue({
        id: 'existing-uuid',
        pegawaiId: 'test-uuid',
        tgl_absensi: new Date('2025-01-02'),
      });

      // Execute the function
      await presensiController.createPresensi(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].message).toBe(
        'Employee already has attendance record for this date'
      );
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
      expect(Presensi.create).not.toHaveBeenCalled();
    });
  });
});
