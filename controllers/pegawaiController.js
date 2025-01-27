const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Pegawai = require('../models/pegawaiModel');
const handlerFactory = require('./handlerFactory');
require('dotenv').config();

exports.getAllPegawai = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '' } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = {};
  if (keyword) {
    whereClause = {
      where: {
        [Op.or]: [
          {
            nama: {
              [Op.iLike]: `%${keyword}%`,
            },
          },
          {
            nip: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            jabatan: {
              [Op.iLike]: `%${keyword}%`,
            },
          },
        ],
      },
    };
  }

  const total = await Pegawai.count(whereClause);

  let findAllOptions = {
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  };

  if (keyword) {
    findAllOptions = Object.assign(findAllOptions, whereClause);
  }

  const pegawai = await Pegawai.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: pegawai.length,
    data: pegawai,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});

exports.createPegawai = catchAsync(async (req, res, next) => {
  const pegawai = await Pegawai.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      pegawai,
    },
  });
});

exports.updatePegawai = catchAsync(async (req, res, next) => {
  // Find the berita record by ID
  const pegawai = await Pegawai.findByPk(req.params.id);

  if (!pegawai) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the berita record with the new data
  await pegawai.update(req.body);

  res.status(200).json({
    status: 'success',
    data: pegawai,
  });
});

exports.getPegawai = catchAsync(async (req, res, next) => {
  const pegawai = await Pegawai.findByPk(req.params.id);

  if (!pegawai) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: pegawai,
  });
});

exports.deletePegawai = handlerFactory.deleteOne(Pegawai);
