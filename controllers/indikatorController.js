const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Indikator = require('../models/indikatorModel');
const handlerFactory = require('./handlerFactory');
require('dotenv').config();

exports.getAllIndikator = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '' } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = {};
  if (keyword) {
    whereClause = {
      where: {
        nama: {
          [Op.like]: `%${keyword}%`,
        },
      },
    };
  }

  const total = await Indikator.count(whereClause);

  let findAllOptions = {
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  };

  if (keyword) {
    findAllOptions = Object.assign(findAllOptions, whereClause);
  }

  const indikator = await Indikator.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: indikator.length,
    data: indikator,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});
exports.createIndikator = catchAsync(async (req, res, next) => {
  const indikator = await Indikator.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      regulasi: indikator,
    },
  });
});

exports.updateIndikator = catchAsync(async (req, res, next) => {
  // Find the berita record by ID
  const indikator = await Indikator.findByPk(req.params.id);

  if (!indikator) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the berita record with the new data
  await indikator.update(req.body);

  res.status(200).json({
    status: 'success',
    data: indikator,
  });
});

exports.getIndikator = catchAsync(async (req, res, next) => {
  const indikator = await Indikator.findByPk(req.params.id);

  if (!indikator) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: indikator,
  });
});

exports.deleteIndikator = handlerFactory.deleteOne(Indikator);
