const multer = require('multer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const fileHelper = require('../utils/fileHelper');

const File = require('../models/fileModel');
require('dotenv').config();

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('application')) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Not a valid file type! Please upload only valid files.',
        400
      ),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

exports.uploadFile = upload.single('file');

exports.createFile = catchAsync(async (req, res, next) => {
  const { file } = req;

  let url = '';

  if (file) {
    const uploadedFile = await fileHelper.upload(file.buffer);
    if (!uploadedFile) {
      return next(new AppError('Error uploading file', 400));
    }

    url = uploadedFile.secure_url;
  }

  const fileRecord = await File.create({
    file: url.replace('.pdf', ''),
  });

  res.status(201).json({
    status: 'success',
    data: {
      file: fileRecord,
    },
  });
});
