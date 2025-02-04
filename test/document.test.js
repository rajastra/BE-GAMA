const sequelize = require('../utils/database');
const documentController = require('../controllers/documentController');
const Document = require('../models/documentModel');

jest.mock('../models/documentModel');
jest.mock('../models/pegawaiModel');

beforeAll(async () => {
  await sequelize.sync({ force: false });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Document Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      params: {
        id: null,
      },
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('Document', () => {
    it('should add a new document for a specific employee', async () => {
      const documentData = {
        nama_file: 'New Document',
        file: 'https://dokumen-baru',
        pegawaiId: '123',
      };

      const mockDocument = {
        nama_file: documentData.nama_file,
        file: documentData.file,
        pegawaiId: documentData.pegawaiId,
        id: 'document-id',
      };

      Document.create = jest.fn().mockResolvedValue(mockDocument);

      mockReq.body = documentData;

      await documentController.createDocument(mockReq, mockRes, mockNext);

      expect(Document.create).toHaveBeenCalledWith(documentData);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          data: expect.objectContaining({
            nama_file: 'New Document',
            file: 'https://dokumen-baru',
            pegawaiId: '123',
          }),
        },
      });
    });
    it('should get all documents for a specific employee', async () => {
      const employeeId = '123';
      const mockDocuments = [
        {
          id: 'doc-1',
          nama_file: 'Document 1',
          file: 'https://document1.pdf',
          pegawaiId: employeeId,
        },
        {
          id: 'doc-2',
          nama_file: 'Document 2',
          file: 'https://document2.pdf',
          pegawaiId: employeeId,
        },
      ];

      Document.findAll = jest.fn().mockResolvedValue(mockDocuments);

      mockReq.params.id = employeeId;

      await documentController.getDocument(mockReq, mockRes, mockNext);

      expect(Document.findAll).toHaveBeenCalledWith({
        where: { pegawaiId: employeeId },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'doc-1',
            nama_file: 'Document 1',
            file: 'https://document1.pdf',
            pegawaiId: employeeId,
          }),
          expect.objectContaining({
            id: 'doc-2',
            nama_file: 'Document 2',
            file: 'https://document2.pdf',
            pegawaiId: employeeId,
          }),
        ]),
      });
    });
  });
});
