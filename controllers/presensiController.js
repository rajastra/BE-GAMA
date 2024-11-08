const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Presensi = require('../models/presensiModel');
const handlerFactory = require('./handlerFactory');
const Pegawai = require('../models/pegawaiModel');
require('dotenv').config();

exports.getAllPresensi = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    keyword = '',
    tanggalMulai,
    tanggalAkhir,
  } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = {};
  if (keyword || tanggalMulai || tanggalAkhir) {
    whereClause = {
      where: {
        [Op.and]: [
          keyword
            ? {
                '$Pegawai.nama$': {
                  [Op.like]: `%${keyword}%`,
                },
              }
            : {},
          tanggalMulai
            ? {
                tgl_absensi: {
                  [Op.gte]: new Date(tanggalMulai),
                },
              }
            : {},
          tanggalAkhir
            ? {
                tgl_absensi: {
                  [Op.lte]: new Date(tanggalAkhir),
                },
              }
            : {},
        ],
      },
      include: [
        {
          model: Pegawai,
        },
      ],
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

  if (keyword || tanggalMulai || tanggalAkhir) {
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
  // get presensi data from model get first data for today
  const presensiToday = await Presensi.findOne({
    where: {
      tgl_absensi: new Date(),
    },
  });

  // if presensi data for today is exist, return error
  if (presensiToday) {
    return next(new AppError('Presensi for today already exist', 400));
  }

  const presensiData = Array.isArray(req.body) ? req.body : [req.body];
  const presensi = await Presensi.bulkCreate(presensiData);

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

exports.getRecap = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    keyword = '',
    tanggalMulai,
    tanggalAkhir,
  } = req.query;

  const offset = (page - 1) * limit;

  // Initialize where clause for Pegawai filtering
  const pegawaiWhereClause = {};

  // Add keyword filter if provided
  if (keyword) {
    pegawaiWhereClause.nama = {
      [Op.iLike]: `%${keyword}%`,
    };
  }

  // Define where clause for Presensi filtering by date range
  const presensiWhereClause = {};
  if (tanggalMulai) {
    presensiWhereClause.tgl_absensi = {
      [Op.gte]: new Date(tanggalMulai),
    };
  }
  if (tanggalAkhir) {
    presensiWhereClause.tgl_absensi = {
      // eslint-disable-next-line
      ...presensiWhereClause.tgl_absensi,
      [Op.lte]: new Date(tanggalAkhir),
    };
  }

  // Count total records for pagination
  const total = await Pegawai.count({
    where: pegawaiWhereClause,
    include: [
      {
        model: Presensi,
        where: presensiWhereClause,
        required: false,
      },
    ],
  });

  // Retrieve paginated data with filters
  const pegawai = await Pegawai.findAll({
    where: pegawaiWhereClause,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    include: [
      {
        model: Presensi,
        attributes: ['status', 'tgl_absensi'],
        where: presensiWhereClause,
        required: false,
      },
    ],
  });

  // Process the data to generate summary counts
  const summary = pegawai.map((karyawan) => {
    const totalRecords = karyawan.Presensis.length;
    const hadirCount = karyawan.Presensis.filter(
      (presensi) => presensi.status === 'Hadir'
    ).length;
    const izinCount = karyawan.Presensis.filter(
      (presensi) => presensi.status === 'Izin'
    ).length;
    const sakitCount = karyawan.Presensis.filter(
      (presensi) => presensi.status === 'Sakit'
    ).length;
    const alpaCount = karyawan.Presensis.filter(
      (presensi) => presensi.status === 'Alpa'
    ).length;

    const akumulasi = totalRecords > 0 ? (hadirCount / totalRecords) * 100 : 0;

    return {
      nama: karyawan.nama,
      nip: karyawan.nip,
      hadir: hadirCount,
      izin: izinCount,
      sakit: sakitCount,
      alpa: alpaCount,
      akumulasi: akumulasi.toFixed(2),
    };
  });

  // Return the result with pagination metadata
  res.status(200).json({
    status: 'success',
    data: summary,
    meta: {
      total,
      per_page: parseInt(limit, 10),
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(total / limit),
    },
  });
});

exports.deletePresensi = handlerFactory.deleteOne(Presensi);
