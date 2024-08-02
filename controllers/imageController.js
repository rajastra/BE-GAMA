const multer = require('multer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const fileHelper = require('../utils/fileHelper');

const Image = require('../models/imageModel');
require('dotenv').config();

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1 MB
  },
});

exports.uploadImage = upload.single('image');

exports.createImage = catchAsync(async (req, res, next) => {
  const { file } = req;

  let url = '';

  if (file) {
    const uploadedFile = await fileHelper.upload(file.buffer);
    if (!uploadedFile) {
      return next(new AppError('Error uploading file', 400));
    }

    url = uploadedFile.secure_url;
  }

  const image = await Image.create({
    image: url,
  });

  res.status(201).json({
    status: 'success',
    data: {
      image,
    },
  });
});
