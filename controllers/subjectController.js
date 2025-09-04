const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const SubjectM = require('../models/subjectModel');

exports.listSubjects = catchAsync(async (req, res) => {
  const {
    q = '',
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortDir = 'ASC',
    all = 'false', // defaultnya pagination
  } = req.query;

  const where = q.trim()
    ? {
        [Op.or]: [
          { code: { [Op.iLike]: `%${q.trim()}%` } },
          { name: { [Op.iLike]: `%${q.trim()}%` } },
        ],
      }
    : undefined;

  // whitelist sorting
  const sortableCols = new Set(['name', 'code', 'createdAt', 'updatedAt']);
  const orderCol = sortableCols.has(String(sortBy)) ? String(sortBy) : 'name';
  const orderDir = String(sortDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // === MODE 1: ALL DATA ===
  if (all === 'true') {
    const rows = await SubjectM.findAll({
      where,
      order: [[orderCol, orderDir]],
    });

    return res.status(200).json({
      status: 'success',
      results: rows.length,
      data: rows,
      meta: {
        mode: 'all',
      },
    });
  }

  // === MODE 2: PAGINATION (DEFAULT) ===
  const pageNum = parseInt(page, 10) || 1;
  const perPage = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * perPage;

  const { rows, count: total } = await SubjectM.findAndCountAll({
    where,
    limit: perPage,
    offset,
    order: [[orderCol, orderDir]],
    distinct: true,
  });

  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: rows,
    meta: {
      mode: 'pagination',
      total,
      per_page: perPage,
      current_page: pageNum,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
      has_next: pageNum * perPage < total,
      has_prev: pageNum > 1,
    },
  });
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
