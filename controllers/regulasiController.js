const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Regulasi = require('../models/regulasiModel');
const handlerFactory = require('./handlerFactory');
require('dotenv').config();

exports.getAllRegulasi = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '' } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = {};
  if (keyword) {
    whereClause = {
      where: {
        title: {
          [Op.like]: `%${keyword}%`,
        },
      },
    };
  }

  const total = await Regulasi.count(whereClause);

  let findAllOptions = {
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  };

  if (keyword) {
    findAllOptions = Object.assign(findAllOptions, whereClause);
  }

  const regulasi = await Regulasi.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: regulasi.length,
    data: regulasi,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});

exports.createRegulasi = catchAsync(async (req, res, next) => {
  const regulasi = await Regulasi.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      regulasi,
    },
  });
});

exports.updateRegulasi = catchAsync(async (req, res, next) => {
  // Find the berita record by ID
  const regulasi = await Regulasi.findByPk(req.params.id);

  if (!regulasi) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the berita record with the new data
  await regulasi.update(req.body);

  res.status(200).json({
    status: 'success',
    data: regulasi,
  });
});

exports.getRegulasi = catchAsync(async (req, res, next) => {
  const regulasi = await Regulasi.findByPk(req.params.id);

  if (!regulasi) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: regulasi,
  });
});

exports.deleteRegulasi = handlerFactory.deleteOne(Regulasi);
