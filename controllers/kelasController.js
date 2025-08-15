const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');
const Kelas = require('../models/kelasModel');
const Siswa = require('../models/siswaModel');
const Pegawai = require('../models/pegawaiModel');
require('dotenv').config();

/**
 * GET /kelas
 * Query:
 *  - page, limit, keyword, pegawaiId
 */
exports.getAllKelas = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, keyword = '', pegawaiId } = req.query;
  const _page = parseInt(page, 10);
  const _limit = parseInt(limit, 10);
  const offset = (_page - 1) * _limit;

  const where = {};
  if (keyword) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${keyword}%` } },
      { grade: { [Op.iLike]: `%${keyword}%` } },
    ];
  }
  if (pegawaiId) where.pegawaiId = pegawaiId;

  const total = await Kelas.count({ where });

  const kelas = await Kelas.findAll({
    where,
    limit: _limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Pegawai,
        as: 'pegawai',
        attributes: ['id', 'nama', 'nip', 'jabatan'],
      },
      {
        model: Siswa,
        as: 'students',
        attributes: ['id', 'name', 'nis', 'gender'],
      },
    ],
  });

  res.status(200).json({
    status: 'success',
    results: kelas.length,
    data: kelas,
    meta: {
      total,
      per_page: _limit,
      current_page: _page,
    },
  });
});

/**
 * POST /kelas
 */
exports.createKelas = catchAsync(async (req, res, next) => {
  const { name, grade, pegawaiId } = req.body;

  if (!name || !pegawaiId) {
    return next(new AppError('name dan pegawaiId wajib diisi.', 400));
  }

  // validasi pegawai
  const pegawai = await Pegawai.findByPk(pegawaiId);
  if (!pegawai) return next(new AppError('Pegawai tidak ditemukan.', 404));

  const kelas = await Kelas.create({ name, grade, pegawaiId });

  res.status(201).json({
    status: 'success',
    data: { kelas },
  });
});

/**
 * PATCH /kelas/:id
 */
exports.updateKelas = catchAsync(async (req, res, next) => {
  const kelas = await Kelas.findByPk(req.params.id);
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  if (req.body.pegawaiId) {
    const exists = await Pegawai.findByPk(req.body.pegawaiId);
    if (!exists) return next(new AppError('Pegawai tidak ditemukan.', 404));
  }

  await kelas.update(req.body);

  res.status(200).json({
    status: 'success',
    data: kelas,
  });
});

/**
 * GET /kelas/:id
 */
exports.getKelas = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Ambil kelas + wali kelas (pegawai)
  const kelas = await Kelas.findByPk(id, {
    include: [
      {
        model: Pegawai,
        as: 'pegawai',
        attributes: ['id', 'nama', 'nip', 'jabatan'],
      },
    ],
  });

  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  // --- Query params ---
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(limitRaw || 10, 1), 100);
  const offset = (page - 1) * limit;

  const q = (req.query.keyword || '').trim();

  // Whitelist kolom sort agar aman
  const ALLOWED_SORT = [
    'id',
    'name',
    'gender',
    'religion',
    'city_of_birth',
    'createdAt',
    'updatedAt',
  ];
  const sortBy = ALLOWED_SORT.includes(req.query.sortBy)
    ? req.query.sortBy
    : 'name';
  const order =
    (req.query.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // --- Filter siswa di kelas ini + pencarian ---
  const whereSiswa = { kelasId: id };
  if (q) {
    // Postgres: iLike untuk case-insensitive
    whereSiswa.name = { [Op.iLike]: `%${q}%` };
  }

  // --- Ambil siswa dengan pagination ---
  const { rows: studentRows, count: total } = await Siswa.findAndCountAll({
    where: whereSiswa,
    order: [[sortBy, order]],
    limit,
    offset,
    // attributes: { exclude: ['password'] }, // jika ada kolom sensitif
  });

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  // Susun payload: data kelas + blok students ter-paginate
  const payload = {
    ...kelas.toJSON(),
    students: {
      rows: studentRows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      query: {
        q: q || null,
        sortBy,
        order,
      },
    },
  };

  res.status(200).json({
    status: 'success',
    data: payload,
  });
});

/**
 * DELETE /kelas/:id
 */
exports.deleteKelas = handlerFactory.deleteOne(Kelas);

/**
 * POST /kelas/:id/students/batch
 */
exports.addStudentsBatch = catchAsync(async (req, res, next) => {
  const { id } = req.params; // kelas tujuan
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return next(
      new AppError('"studentIds" harus array dan tidak boleh kosong.', 400)
    );
  }

  // validasi kelas tujuan
  const kelasTujuan = await Kelas.findByPk(id);
  if (!kelasTujuan) return next(new AppError('Kelas tidak ditemukan.', 404));

  // ambil siswa yang ada berdasarkan id
  const existingStudents = await Siswa.findAll({
    where: { id: { [Op.in]: studentIds } },
    attributes: ['id', 'kelasId', 'name'],
  });

  // id yang tidak ditemukan
  const foundIds = new Set(existingStudents.map((s) => s.id));
  const notFound = studentIds.filter((x) => !foundIds.has(x));

  // partisi
  const toMove = existingStudents.filter((s) => s.kelasId !== id);
  const alreadyInClass = existingStudents.filter((s) => s.kelasId === id);

  // pindahkan secara atomik
  const movedCount = await Kelas.sequelize.transaction(async (t) => {
    if (toMove.length === 0) return 0;

    const moveIds = toMove.map((s) => s.id);
    const [affected] = await Siswa.update(
      { kelasId: id },
      { where: { id: { [Op.in]: moveIds } }, transaction: t }
    );
    return affected;
  });

  // (opsional) ambil ulang data siswa yang dipindah untuk ditampilkan
  const movedStudents =
    toMove.length > 0
      ? await Siswa.findAll({
          where: { id: { [Op.in]: toMove.map((s) => s.id) } },
          attributes: ['id', 'name', 'nis', 'kelasId'],
        })
      : [];

  res.status(200).json({
    status: 'success',
    message: `Dipindahkan ${movedCount} siswa ke kelas ${kelasTujuan.name}.`,
    moved: {
      count: movedCount,
      ids: toMove.map((s) => s.id),
      data: movedStudents, // bisa dipakai FE jika perlu
    },
    alreadyInClass: {
      count: alreadyInClass.length,
      ids: alreadyInClass.map((s) => s.id),
    },
    notFound: {
      count: notFound.length,
      ids: notFound,
    },
  });
});

exports.getStudentsNotInClass = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Pastikan kelas ada (opsional, tapi bagus untuk validasi)
  const kelas = await Kelas.findByPk(id, { attributes: ['id', 'name'] });
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  // --- Query params ---
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(limitRaw || 10, 1), 100);
  const offset = (page - 1) * limit;

  const q = (req.query.keyword || '').trim();
  const onlyUnassigned =
    String(req.query.onlyUnassigned || 'false').toLowerCase() === 'true';

  const ALLOWED_SORT = ['id', 'nis', 'name', 'createdAt', 'updatedAt'];
  const sortBy = ALLOWED_SORT.includes(req.query.sortBy)
    ? req.query.sortBy
    : 'name';
  const order =
    (req.query.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // exclude=1,2,3
  const excludeIds = (req.query.exclude || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite);

  // --- WHERE ---
  const where = {};

  // Tidak berada di kelas ini:
  // Perlu OR agar siswa kelasId NULL juga ikut (NULL != id bukan TRUE).
  if (onlyUnassigned) {
    where.kelasId = { [Op.is]: null };
  } else {
    where[Op.or] = [
      { kelasId: { [Op.ne]: id } },
      { kelasId: { [Op.is]: null } },
    ];
  }

  if (q) {
    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } }, // Postgres
          { nis: { [Op.iLike]: `%${q}%` } },
        ],
      },
    ];
  }

  if (excludeIds.length) {
    where.id = { [Op.notIn]: excludeIds };
  }

  // --- Query ---
  const { rows, count: total } = await Siswa.findAndCountAll({
    where,
    order: [[sortBy, order]],
    limit,
    offset,
    // attributes: ['id','nis','name','gender'] // sesuaikan bila perlu
  });

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  res.status(200).json({
    status: 'success',
    data: {
      class: kelas, // { id, nama }
      students: {
        rows,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
        query: {
          q: q || null,
          sortBy,
          order,
          onlyUnassigned,
          exclude: excludeIds,
        },
      },
    },
  });
});

exports.moveStudents = catchAsync(async (req, res, next) => {
  const { id } = req.params; // kelas asal
  const { studentIds, targetKelasId } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return next(
      new AppError('"studentIds" harus array dan tidak boleh kosong.', 400)
    );
  }
  if (!targetKelasId) {
    return next(new AppError('"targetKelasId" wajib diisi.', 400));
  }

  // validasi kelas asal
  const kelasAsal = await Kelas.findByPk(id);
  if (!kelasAsal) return next(new AppError('Kelas asal tidak ditemukan.', 404));

  // validasi kelas tujuan
  const kelasTujuan = await Kelas.findByPk(targetKelasId);
  if (!kelasTujuan)
    return next(new AppError('Kelas tujuan tidak ditemukan.', 404));

  // update kelasId siswa
  const [updatedCount] = await Siswa.update(
    { kelasId: targetKelasId },
    { where: { id: studentIds, kelasId: id } }
  );

  res.status(200).json({
    status: 'success',
    updated: updatedCount,
    message: `${updatedCount} siswa berhasil dipindahkan dari ${kelasAsal.name} ke ${kelasTujuan.name}`,
  });
});
