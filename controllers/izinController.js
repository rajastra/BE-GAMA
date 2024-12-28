/* eslint-disable no-await-in-loop */
const { Op } = require('sequelize');
const moment = require('moment');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Izin = require('../models/izinModel');
const handlerFactory = require('./handlerFactory');
const Pegawai = require('../models/pegawaiModel');
const Presensi = require('../models/presensiModel');
require('dotenv').config();

const createPresensiWithRangeDate = async (izinData) => {
  const tglMulai = moment(izinData.tgl_mulai);
  const tglSelesai = moment(izinData.tgl_selesai);
  const totalIzin = tglSelesai.diff(tglMulai, 'days') + 1;

  for (let i = 0; i < totalIzin; i) {
    const currentDate = moment(tglMulai).add(i, 'days');

    if (currentDate.days() !== 0 && currentDate.days() !== 6) {
      const presensiData = {
        pegawaiId: izinData.pegawaiId,
        tgl_absensi: currentDate.format('YYYY-MM-DD'),
        status: izinData.jenis,
        lampiran: izinData.lampiran,
      };
      console.log(presensiData);

      try {
        await Presensi.create(presensiData);
      } catch (error) {
        console.error(
          `Failed to create presensi for date ${currentDate.format(
            'YYYY-MM-DD'
          )}:`,
          error
        );
        throw new AppError('Failed to create attendance records', 500);
      }
    }
  }
};

exports.getAllIzin = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '' } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = {};
  if (keyword) {
    whereClause = {
      where: {
        [Op.or]: [
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
    return next(new AppError('No permission record found with that ID', 404));
  }

  await izin.update(req.body);

  res.status(200).json({
    status: 'success',
    data: izin,
  });
});

exports.updateStatusIzin = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const izin = await Izin.findByPk(req.params.id, {
    include: [{ model: Pegawai }],
  });
  if (!izin) {
    return next(new AppError('No permission record found with that ID', 404));
  }

  if (status === 'disetujui') {
    try {
      await createPresensiWithRangeDate(izin);
    } catch (error) {
      return next(new AppError('Failed to create attendance records', 500));
    }
  }

  await izin.update({ status });

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
    return next(new AppError('No permission record found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: izin,
  });
});

exports.deleteIzin = handlerFactory.deleteOne(Izin);
