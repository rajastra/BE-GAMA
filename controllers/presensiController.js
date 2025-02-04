/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable camelcase */
const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Presensi = require('../models/presensiModel');
const handlerFactory = require('./handlerFactory');
const Pegawai = require('../models/pegawaiModel');
const sequelize = require('../utils/database');
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

exports.updatePresensi = catchAsync(async (req, res, next) => {
  const presensi = await Presensi.findByPk(req.params.id);

  if (!presensi) {
    return next(new AppError('No document found with that ID', 404));
  }

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

  const pegawaiWhereClause = {};

  if (keyword) {
    pegawaiWhereClause.nama = {
      [Op.iLike]: `%${keyword}%`,
    };
  }

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

  const summary = pegawai.map((x) => {
    const totalRecords = x.Presensis.length;
    const hadirCount = x.Presensis.filter(
      (presensi) => presensi.status === 'Hadir'
    ).length;
    const izinCount = x.Presensis.filter(
      (presensi) => presensi.status === 'Izin'
    ).length;
    const sakitCount = x.Presensis.filter(
      (presensi) => presensi.status === 'Sakit'
    ).length;
    const alpaCount = x.Presensis.filter(
      (presensi) => presensi.status === 'Alpa'
    ).length;

    const akumulasi = totalRecords > 0 ? (hadirCount / totalRecords) * 100 : 0;

    return {
      nama: x.nama,
      nip: x.nip,
      hadir: hadirCount,
      izin: izinCount,
      sakit: sakitCount,
      alpa: alpaCount,
      akumulasi: akumulasi.toFixed(2),
    };
  });

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

exports.getPresensiDB = catchAsync(async (req, res, next) => {
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const { tanggal = getTodayDate() } = req.query;

  const countPegawai = await Pegawai.count();

  const rekapStatus = await Presensi.findAll({
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
    ],
    where: {
      [Op.and]: [
        {
          tgl_absensi: {
            [Op.gte]: new Date(tanggal),
          },
        },
        {
          tgl_absensi: {
            [Op.lte]: new Date(tanggal),
          },
        },
      ],
    },
    group: ['status'],
  });

  // Inisialisasi hasil rekap dengan total status awal
  const hasilRekap = {
    pegawai: countPegawai,
    total: 0,
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
  };

  rekapStatus.forEach((record) => {
    const { status, count } = record.dataValues;

    hasilRekap[status.toLowerCase()] = parseInt(count, 10);
    hasilRekap.total += parseInt(count, 10);
  });

  res.status(200).json({
    status: 'success',
    data: hasilRekap,
  });
});

exports.deletePresensi = handlerFactory.deleteOne(Presensi);

exports.createPresensi = catchAsync(async (req, res, next) => {
  const { pegawaiId, tgl_absensi, lampiran, status } = req.body;

  if (!pegawaiId || !tgl_absensi || !lampiran) {
    return next(new AppError('Please provide all required fields', 400));
  }

  const pegawai = await Pegawai.findByPk(pegawaiId);
  if (!pegawai) {
    return next(new AppError('Employee not found', 404));
  }

  const alreadyPresensi = await Presensi.findOne({
    where: {
      pegawaiId,
      tgl_absensi: new Date(tgl_absensi),
    },
  });

  if (alreadyPresensi) {
    return next(
      new AppError('Employee already has attendance record for this date', 400)
    );
  }

  const presensi = await Presensi.create({
    pegawaiId,
    tgl_absensi: new Date(tgl_absensi),
    lampiran,
    status,
  });

  res.status(201).json({
    status: 'success',
    data: {
      presensi,
    },
  });
});

exports.checkAttendanceStatus = catchAsync(async (req, res, next) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);

    const pegawais = await Pegawai.findAll({
      include: [
        {
          model: Presensi,
          where: {
            tgl_absensi: {
              [Op.gte]: today,
              [Op.lte]: todayEnd,
            },
          },
          required: false,
        },
      ],
    });

    for (const pegawai of pegawais) {
      const presensis = pegawai.Presensis || [];

      if (presensis.length === 0) {
        await Presensi.create({
          pegawaiId: pegawai.id,
          tgl_absensi: new Date(new Date().toISOString().split('T')[0]),
          status: 'Alpa',
          lampiran: null,
        });
      }
    }
  } catch (error) {
    console.error('Error in attendance check:', error);
  }
});
