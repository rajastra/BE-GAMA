const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Document = require('../models/documentModel');
const handlerFactory = require('./handlerFactory');
const Pegawai = require('../models/pegawaiModel');
require('dotenv').config();

exports.getAllDocument = catchAsync(async (req, res, next) => {
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

  const total = await Document.count(whereClause);

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

  const document = await Document.findAll(findAllOptions);

  res.status(200).json({
    status: 'success',
    results: document.length,
    data: document,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
    },
  });
});
exports.createDocument = catchAsync(async (req, res, next) => {
  const document = await Document.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: document,
    },
  });
});

exports.getDocument = catchAsync(async (req, res, next) => {
  //   const document = await Document.findByPk(req.params.id);
  const documents = await Document.findAll({
    where: { pegawaiId: req.params.id },
  });

  if (!documents) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: documents,
  });
});

exports.deleteDocument = handlerFactory.deleteOne(Document);
