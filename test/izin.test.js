/* eslint-disable no-shadow */
const sequelize = require('../utils/database');
const izinController = require('../controllers/izinController');
const Izin = require('../models/izinModel');

jest.mock('../models/pegawaiModel');
jest.mock('../models/izinModel');

beforeAll(async () => {
  await sequelize.sync({ force: false });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Permission Controller', () => {
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

  describe('Izin Controllers', () => {
    it('should create a new successful permission', async () => {
      const permissionData = {
        tgl_mulai: '2024-12-10',
        tgl_selesai: '2024-12-13',
        jenis: 'izin',
        alasan: 'test-alasan',
        pegawaiId: '123',
      };

      const mockPermission = {
        id: 'permission-id',
        tgl_mulai: permissionData.tgl_mulai,
        tgl_selesai: permissionData.tgl_selesai,
        jenis: permissionData.jenis,
        alasan: permissionData.alasan,
        pegawaiId: permissionData.pegawaiId,
        status: 'diajukan',
      };

      Izin.create = jest.fn().mockResolvedValue(mockPermission);

      mockReq.body = permissionData;

      await izinController.createIzin(mockReq, mockRes, mockNext);

      expect(Izin.create).toHaveBeenCalledWith(permissionData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          izin: expect.objectContaining({
            id: 'permission-id',
            tgl_mulai: permissionData.tgl_mulai,
            tgl_selesai: permissionData.tgl_selesai,
            jenis: permissionData.jenis,
            alasan: permissionData.alasan,
            pegawaiId: permissionData.pegawaiId,
            status: 'diajukan',
          }),
        },
      });
    });
    it('successfully update the permit status with "disetujui" status', async () => {
      const mockReq = {
        params: { id: 'permission-id' },
        body: {
          status: 'disetujui',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockNext = jest.fn();

      const mockPermission = {
        id: 'permission-id',
        tgl_mulai: '2024-12-10',
        tgl_selesai: '2024-12-13',
        jenis: 'izin',
        alasan: 'test-alasan',
        pegawaiId: '123',
        status: 'diajukan',
      };

      mockPermission.update = jest
        .fn()
        .mockImplementation(function (updateData) {
          this.status = updateData.status;
          return Promise.resolve(this);
        });

      Izin.findByPk = jest.fn().mockResolvedValue(mockPermission);

      await izinController.updateIzin(mockReq, mockRes, mockNext);

      expect(Izin.findByPk).toHaveBeenCalledWith('permission-id');
      expect(mockPermission.update).toHaveBeenCalledWith({
        status: 'disetujui',
      });
      expect(mockPermission.status).toBe('disetujui');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockPermission,
      });
    });
  });
});
