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
    tgl_lahir,
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
        tgl_lahir,
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
    // Kunci baris siswa yang akan diupdate (row-level lock)
    const siswa = await Siswa.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE, // atau lock: true tergantung dialect
    });

    if (!siswa) {
      await t.rollback();
      return next(new AppError('No document found with that ID', 404));
    }

    // Pisahkan field milik User dari body
    const { name, email, password, ...siswaFields } = req.body;

    // Update data Siswa saja dengan field tersisa
    await siswa.update(siswaFields, { transaction: t });

    // Ambil user terkait (tanpa lock tabel User)
    const user = await User.findByPk(siswa.userId, { transaction: t });

    // Jika ada perubahan untuk User
    if (user && (name || email || password)) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (email) userUpdate.email = email;
      if (password) {
        // hash password bila dikirim
        userUpdate.password = await bcrypt.hash(password, 10);
      }

      // Hanya update bila memang ada field yang diubah
      if (Object.keys(userUpdate).length > 0) {
        await user.update(userUpdate, { transaction: t });
      }
    }

    await t.commit();

    // Ambil data terbaru, sembunyikan password
    const updatedSiswa = await Siswa.findByPk(req.params.id, {
      include: [{ model: User, attributes: { exclude: ['password'] } }],
    });

    res.status(200).json({
      status: 'success',
      data: updatedSiswa,
    });
  } catch (error) {
    // Pastikan transaksi dibatalkan saat error
    try { await t.rollback(); } catch (_) {}
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
