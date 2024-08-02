const multer = require('multer');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const fileHelper = require('../utils/fileHelper');

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

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

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

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.createUser = factory.createOne(User);
exports.updateUser = factory.updateOne(User); // Do not update passwords with this!
exports.deleteUser = factory.deleteOne(User);
