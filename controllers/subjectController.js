const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const SubjectM = require('../models/subjectModel');

exports.listSubjects = catchAsync(async (req, res) => {
  const q = (req.query.q || '').trim();
  const where = q
    ? {
        [Op.or]: [
          { code: { [Op.iLike]: `%${q}%` } },
          { name: { [Op.iLike]: `%${q}%` } },
        ],
      }
    : {};
  const rows = await SubjectM.findAll({ where, order: [['name', 'ASC']] });
  res.json({ status: 'success', data: rows });
});

// POST /subjects
exports.createSubject = catchAsync(async (req, res, next) => {
  const { code, name } = req.body;
  if (!code || !name) return next(new AppError('code & name wajib.', 400));
  const row = await SubjectM.create({ code, name });
  res.status(201).json({ status: 'success', data: row });
});

// PATCH /subjects/:id
exports.updateSubject = catchAsync(async (req, res, next) => {
  const row = await SubjectM.findByPk(req.params.id);
  if (!row) return next(new AppError('Subject tidak ditemukan.', 404));
  await row.update(req.body);
  res.json({ status: 'success', data: row });
});

// DELETE /subjects/:id
exports.deleteSubject = catchAsync(async (req, res, next) => {
  const row = await SubjectM.findByPk(req.params.id);
  if (!row) return next(new AppError('Subject tidak ditemukan.', 404));
  await row.destroy();
  res.status(204).json({ status: 'success', data: null });
});
