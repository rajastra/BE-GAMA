/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable no-shadow */
const sequelize = require('../utils/database');
const izinController = require('../controllers/izinController');
const Izin = require('../models/izinModel');
const Pegawai = require('../models/pegawaiModel');
const Presensi = require('../models/presensiModel');

jest.mock('../models/pegawaiModel');
jest.mock('../models/izinModel');
jest.mock('../models/presensiModel');

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
    mockReq = {
      body: {},
      params: {
        id: 'test-uuid',
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Izin Controllers', () => {
    describe('createIzin', () => {
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
    });

    describe('updateStatusIzin', () => {
      it('should successfully update status to disetujui and create presensi records', async () => {
        const mockIzin = {
          id: 'test-uuid',
          pegawaiId: 'pegawai-uuid',
          tgl_mulai: '2025-01-01',
          tgl_selesai: '2025-01-03',
          jenis: 'cuti',
          status: 'diajukan',
          lampiran: 'test.pdf',
          update: jest.fn().mockResolvedValue(true),
        };

        mockReq.body = { status: 'disetujui' };

        // Mock Izin.findByPk
        const findByPkMock = jest
          .spyOn(Izin, 'findByPk')
          .mockResolvedValue(mockIzin);

        // Mock Presensi.create
        Presensi.create.mockResolvedValue({});

        // Execute controller
        await izinController.updateStatusIzin(mockReq, mockRes, mockNext);

        // Assertions
        expect(findByPkMock).toHaveBeenCalledWith(
          'test-uuid',
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                model: Pegawai,
              }),
            ]),
          })
        );
        expect(Presensi.create).toHaveBeenCalledTimes(2);
        expect(mockIzin.update).toHaveBeenCalledWith({ status: 'disetujui' });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'success',
          data: mockIzin,
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 404 if izin record not found', async () => {
        mockReq.body = { status: 'disetujui' };

        // Mock Izin.findByPk to return null
        Izin.findByPk.mockResolvedValue(null);

        // Execute controller
        await izinController.updateStatusIzin(mockReq, mockRes, mockNext);

        // Assertions
        expect(Izin.findByPk).toHaveBeenCalledWith('test-uuid', {
          include: [{ model: Pegawai }],
        });
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: 'No permission record found with that ID',
          })
        );
        expect(Presensi.create).not.toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      it('should handle failed attendance record creation', async () => {
        const mockIzin = {
          id: 'test-uuid',
          pegawaiId: 'pegawai-uuid',
          tgl_mulai: '2025-01-01',
          tgl_selesai: '2025-01-03',
          jenis: 'cuti',
          status: 'diajukan',
          lampiran: 'test.pdf',
          update: jest.fn(),
        };

        mockReq.body = { status: 'disetujui' };

        // Mock Izin.findByPk
        Izin.findByPk.mockResolvedValue(mockIzin);

        // Mock Presensi.create to throw error
        Presensi.create.mockRejectedValue(new Error('Database error'));

        // Execute controller
        await izinController.updateStatusIzin(mockReq, mockRes, mockNext);

        // Assertions
        expect(Izin.findByPk).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: 'Failed to create attendance records',
          })
        );
        expect(mockIzin.update).not.toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      it('should not create attendance records when status is ditolak', async () => {
        const mockIzin = {
          id: 'test-uuid',
          pegawaiId: 'pegawai-uuid',
          tgl_mulai: '2025-01-01',
          tgl_selesai: '2025-01-03',
          jenis: 'cuti',
          status: 'diajukan',
          lampiran: 'test.pdf',
          update: jest.fn().mockResolvedValue(true),
        };

        mockReq.body = { status: 'ditolak' };

        // Mock Izin.findByPk
        Izin.findByPk.mockResolvedValue(mockIzin);

        // Execute controller
        await izinController.updateStatusIzin(mockReq, mockRes, mockNext);

        // Assertions
        expect(Izin.findByPk).toHaveBeenCalled();
        expect(Presensi.create).not.toHaveBeenCalled();
        expect(mockIzin.update).toHaveBeenCalledWith({ status: 'ditolak' });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'success',
          data: mockIzin,
        });
      });
    });
  });
});
