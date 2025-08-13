const { Op } = require('sequelize');
const sequelize = require('../utils/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Siswa = require('../models/siswaModel');
const User = require('../models/userModel');
const Kelas = require('../models/kelasModel');
const handlerFactory = require('./handlerFactory');
require('dotenv').config();

exports.getAllSiswa = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '' } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const perPage = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * perPage;

  // where untuk Siswa
  const where = keyword
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${keyword}%` } }, // ganti ke Op.iLike kalau pakai Postgres
          { nisn: { [Op.iLike]: `%${keyword}%` } }, // opsional: jika ada kolom nisn
        ],
      }
    : undefined;

  // include kelas aktif saja (end_date null)
  const include = [
    {
      model: Kelas,
      as: 'class',
      attributes: ['id', 'name'],
      required: false, // siswa tanpa kelas tetap muncul
    },
  ];

  // find + count dalam satu call
  const { rows: siswa, count: total } = await Siswa.findAndCountAll({
    where,
    include,
    limit: perPage,
    offset,
    order: [['name', 'ASC']],
    distinct: true, // penting agar count tidak dobel karena join
  });

  res.status(200).json({
    status: 'success',
    results: siswa.length,
    data: siswa,
    meta: {
      total,
      per_page: perPage,
      current_page: pageNum,
      total_pages: Math.ceil(total / perPage),
    },
  });
});

exports.createSiswa = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    nis,
    nik,
    nisn,
    gender,
    religion,
    city_of_birth: cityOfBirth,
  } = req.body;

  const t = await sequelize.transaction();

  try {
    const user = await User.create(
      {
        name,
        email,
        password,
        role: 'siswa',
      },
      { transaction: t }
    );

    const siswa = await Siswa.create(
      {
        name,
        nis,
        nik,
        nisn,
        gender,
        religion,
        city_of_birth: cityOfBirth,
        userId: user.id, // assuming user.id is the foreign key
      },
      { transaction: t }
    );

    await t.commit();

    res.status(201).json({
      status: 'success',
      data: {
        siswa,
      },
    });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
});

exports.updateSiswa = catchAsync(async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    // Lock hanya pada tabel Siswa
    const siswa = await Siswa.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!siswa) {
      await t.rollback();
      return next(new AppError('No document found with that ID', 404));
    }

    // Update data siswa
    await siswa.update(req.body, { transaction: t });

    // Ambil user terkait (tanpa lock)
    const user = await User.findByPk(siswa.userId, { transaction: t });

    // Jika ada data user yang ingin diupdate (misal: name, email, password)
    const { name, email } = req.body;
    if (user && (name || email || password)) {
      await user.update(
        {
          ...(name && { name }),
          ...(email && { email }),
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Ambil data terbaru setelah update (dengan relasi User)
    const updatedSiswa = await Siswa.findByPk(req.params.id, {
      include: [{ model: User }],
    });

    // Bersihkan response agar tidak circular
    const siswaPlain = updatedSiswa.get({ plain: true });
    const { User: userObj, ...siswaData } = siswaPlain;
    const responseData = {
      ...siswaData,
      user: userObj
        ? {
            id: userObj.id,
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
          }
        : null,
    };

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
});

exports.getSiswa = catchAsync(async (req, res, next) => {
  const siswa = await Siswa.findByPk(req.params.id, {
    include: [
      {
        model: User,
      },
    ],
  });

  if (!siswa) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: siswa,
  });
});

exports.deleteSiswa = handlerFactory.deleteOne(Siswa);
