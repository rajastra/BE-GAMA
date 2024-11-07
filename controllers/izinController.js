const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Izin = require('../models/izinModel');
const handlerFactory = require('./handlerFactory');
const Pegawai = require('../models/pegawaiModel');
require('dotenv').config();

exports.getAllIzin = catchAsync(async (req, res, next) => {
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

  const total = await Izin.count(whereClause);

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

  const izin = await Izin.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: izin.length,
    data: izin,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});
exports.createIzin = catchAsync(async (req, res, next) => {
  const izin = await Izin.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      izin,
    },
  });
});

exports.updateIzin = catchAsync(async (req, res, next) => {
  // Find the berita record by ID
  const izin = await Izin.findByPk(req.params.id);

  if (!izin) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the berita record with the new data
  await izin.update(req.body);

  res.status(200).json({
    status: 'success',
    data: izin,
  });
});

exports.getIzin = catchAsync(async (req, res, next) => {
  const izin = await Izin.findByPk(req.params.id, {
    include: [
      {
        model: Pegawai,
      },
    ],
  });

  if (!izin) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: izin,
  });
});

exports.deleteIzin = handlerFactory.deleteOne(Izin);
