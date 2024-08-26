const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Presensi = require('../models/presensiModel');
const handlerFactory = require('./handlerFactory');
const Pegawai = require('../models/pegawaiModel');
require('dotenv').config();

exports.getAllPresensi = catchAsync(async (req, res, next) => {
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

  const total = await Presensi.count(whereClause);

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

  const presensi = await Presensi.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: presensi.length,
    data: presensi,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});

exports.createPresensi = catchAsync(async (req, res, next) => {
  const presensi = await Presensi.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      presensi: presensi,
    },
  });
});

exports.updatePresensi = catchAsync(async (req, res, next) => {
  // Find the berita record by ID
  const presensi = await Presensi.findByPk(req.params.id);

  if (!presensi) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the berita record with the new data
  await presensi.update(req.body);

  res.status(200).json({
    status: 'success',
    data: presensi,
  });
});

exports.getPresensi = catchAsync(async (req, res, next) => {
  const presensi = await Presensi.findByPk(req.params.id);

  if (!presensi) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: presensi,
  });
});

exports.deletePresensi = handlerFactory.deleteOne(Presensi);
