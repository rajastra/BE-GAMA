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
      { name: { [Op.like]: `%${keyword}%` } },
      { grade: { [Op.like]: `%${keyword}%` } },
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
  const kelas = await Kelas.findByPk(req.params.id, {
    include: [
      {
        model: Pegawai,
        as: 'pegawai',
        attributes: ['id', 'nama', 'nip', 'jabatan'],
      },
      { model: Siswa, as: 'students' },
    ],
  });

  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  res.status(200).json({
    status: 'success',
    data: kelas,
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
