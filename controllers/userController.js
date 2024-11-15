const multer = require('multer');
const { Op } = require('sequelize');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const fileHelper = require('../utils/fileHelper');
const Pegawai = require('../models/pegawaiModel');

const upload = multer({
  storage: multer.memoryStorage(),
});

exports.uploadUserPhoto = upload.single('photo');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = catchAsync(async (req, res, next) => {
  // req.params.id = req.user.id;
  // next();
  const user = await User.findByPk(req.params.id, {
    include: [
      {
        model: Pegawai,
      },
    ],
  });

  if (!user) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.'
      ),
      400
    );
  }

  // Filtered out unwanted fields names that are not allowed to be updated

  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// update user photo
exports.updateUserPhoto = catchAsync(async (req, res, next) => {
  const { file } = req;

  // Find the user record by ID
  const user = await User.findByPk(req.params.id);

  const data = {};

  if (!user) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the user record with the new data
  if (file) {
    const uploadedFile = await fileHelper.upload(file.buffer, user.photo_url);
    if (!uploadedFile) {
      return next(new AppError('Error uploading file', 400));
    }

    data.photo = uploadedFile.secure_url;
  }

  await user.update(data);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '' } = req.query;

  const offset = (page - 1) * limit;

  console.log(keyword);

  let whereClause = {};
  if (keyword) {
    whereClause = {
      where: {
        [Op.or]: [
          {
            email: {
              [Op.iLike]: `%${keyword}%`,
            },
          },
          {
            '$Pegawai.nama$': {
              [Op.iLike]: `%${keyword}%`,
            },
          },
        ],
      },
      include: [
        {
          model: Pegawai,
        },
      ],
    };
  }

  const total = await User.count(whereClause);

  let findAllOptions = {
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    include: [
      {
        model: Pegawai,
      },
    ],
  };

  if (keyword) {
    findAllOptions = Object.assign(findAllOptions, whereClause);
  }

  const user = await User.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: User.length,
    data: user,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.params.id, {
    include: [Pegawai],
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.createUser = factory.createOne(User);
exports.updateUser = factory.updateOne(User); // Do not update passwords with this!
exports.deleteUser = factory.deleteOne(User);
