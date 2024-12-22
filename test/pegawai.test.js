const sequelize = require('../utils/database');
const pegawaiController = require('../controllers/pegawaiController');
const Pegawai = require('../models/pegawaiModel');

jest.mock('../models/pegawaiModel');

beforeAll(async () => {
  await sequelize.sync({ force: false });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Pegawai Controller', () => {
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

  describe('Add employee', () => {
    it('should create new employee success', async () => {
      const pegawaiData = {
        nip: '1234567890',
        nama: 'testAddEmployee',
        jabatan: 'teacher',
        tgl_lahir: '2004-10-19',
        alamat: 'Jl. Diponogoro Sukarame Bandar Lampung',
        jenis_kelamin: 'Laki-laki',
        nomor_telepon: '0896647546375',
      };

      const mockEmployee = {
        nip: pegawaiData.nip,
        nama: pegawaiData.nama,
        jabatan: pegawaiData.jabatan,
        tgl_lahir: pegawaiData.tgl_lahir,
        alamat: pegawaiData.alamat,
        jenis_kelamin: pegawaiData.jenis_kelamin,
        nomor_telepon: pegawaiData.nomor_telepon,
        id: 'employee-id',
      };

      Pegawai.create = jest.fn().mockResolvedValue(mockEmployee);

      mockReq.body = pegawaiData;

      await pegawaiController.createPegawai(mockReq, mockRes, mockNext);

      expect(Pegawai.create).toHaveBeenCalledWith(pegawaiData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          pegawai: expect.objectContaining({
            id: 'employee-id',
            nip: '1234567890',
            nama: 'testAddEmployee',
            jabatan: 'teacher',
            tgl_lahir: '2004-10-19',
            alamat: 'Jl. Diponogoro Sukarame Bandar Lampung',
            jenis_kelamin: 'Laki-laki',
            nomor_telepon: '0896647546375',
          }),
        },
      });
    });
  });
});
