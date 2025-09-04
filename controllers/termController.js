// controllers/termController.js
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const TermM = require('../models/termModel');
const GradingPolicyM = require('../models/gradingPolicyModel');
const AssessmentM = require('../models/assesmentModel');

/**
 * GET /terms
 * Query:
 *  - page=1, limit=10
 *  - q=keyword (cari name / yearLabel)
 *  - sortBy=name|yearLabel|startDate|endDate|createdAt|updatedAt
 *  - sortDir=ASC|DESC
 *  - all=true (abaikan pagination)
 */
exports.getAllTerms = catchAsync(async (req, res, next) => {
  const {
    q = '',
    page = 1,
    limit = 10,
    sortBy = 'startDate',
    sortDir = 'ASC',
    all = 'false',
  } = req.query;

  const keyword = q.trim();
  const where = keyword
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${keyword}%` } },
          { yearLabel: { [Op.iLike]: `%${keyword}%` } },
        ],
      }
    : {};

  const SORTABLE = new Set([
    'name',
    'yearLabel',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
  ]);
  const _sortBy = SORTABLE.has(String(sortBy)) ? String(sortBy) : 'startDate';
  const _sortDir = String(sortDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const order = [[_sortBy, _sortDir]];

  if (String(all) === 'true') {
    const rows = await TermM.findAll({ where, order });
    return res.status(200).json({
      status: 'success',
      data: rows,
      meta: { mode: 'all', total: rows.length },
    });
  }

  const _page = Math.max(parseInt(page, 10) || 1, 1);
  const _limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const offset = (_page - 1) * _limit;

  const { rows, count: total } = await TermM.findAndCountAll({
    where,
    order,
    limit: _limit,
    offset,
  });

  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: rows,
    meta: {
      mode: 'pagination',
      total,
      per_page: _limit,
      current_page: _page,
      total_pages: Math.max(1, Math.ceil(total / _limit)),
      has_next: _page * _limit < total,
      has_prev: _page > 1,
      query: { q: keyword || null },
    },
  });
});

/**
 * GET /terms/:id
 */
exports.getTerm = catchAsync(async (req, res, next) => {
  const row = await TermM.findByPk(req.params.id);
  if (!row) return next(new AppError('Term tidak ditemukan.', 404));
  res.status(200).json({ status: 'success', data: row });
});

/**
 * POST /terms
 * Body: { name, yearLabel, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD) }
 * Validasi:
 *  - startDate <= endDate
 *  - tidak overlap dengan term lain di rentang tanggal
 */
exports.createTerm = catchAsync(async (req, res, next) => {
  const { name, yearLabel, startDate, endDate } = req.body || {};

  if (!name || !yearLabel || !startDate || !endDate) {
    return next(
      new AppError('name, yearLabel, startDate, endDate wajib diisi.', 400)
    );
  }

  // Validasi format & urutan tanggal
  if (
    !dayjs(startDate, 'YYYY-MM-DD', true).isValid() ||
    !dayjs(endDate, 'YYYY-MM-DD', true).isValid()
  ) {
    return next(new AppError('Format tanggal harus YYYY-MM-DD.', 400));
  }
  if (dayjs(startDate).isAfter(dayjs(endDate))) {
    return next(new AppError('startDate tidak boleh lebih besar dari endDate.', 400));
  }

  // Cek overlap periode dengan term lain (interval bersinggungan)
  const overlap = await TermM.findOne({
    where: {
      [Op.or]: [
        {
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: startDate },
        },
      ],
    },
  });
  if (overlap) {
    return next(
      new AppError('Rentang tanggal bertumpuk dengan term lain.', 400)
    );
  }

  const row = await TermM.create({ name, yearLabel, startDate, endDate });
  res.status(201).json({ status: 'success', data: row });
});

/**
 * PATCH /terms/:id
 * Body (opsional): { name, yearLabel, startDate, endDate }
 * Validasi sama seperti create + overlap (kecuali diri sendiri).
 */
exports.updateTerm = catchAsync(async (req, res, next) => {
  const row = await TermM.findByPk(req.params.id);
  if (!row) return next(new AppError('Term tidak ditemukan.', 404));

  const payload = {
    name: req.body.name ?? row.name,
    yearLabel: req.body.yearLabel ?? row.yearLabel,
    startDate: req.body.startDate ?? row.startDate,
    endDate: req.body.endDate ?? row.endDate,
  };

  if (
    !dayjs(payload.startDate, 'YYYY-MM-DD', true).isValid() ||
    !dayjs(payload.endDate, 'YYYY-MM-DD', true).isValid()
  ) {
    return next(new AppError('Format tanggal harus YYYY-MM-DD.', 400));
  }
  if (dayjs(payload.startDate).isAfter(dayjs(payload.endDate))) {
    return next(new AppError('startDate tidak boleh lebih besar dari endDate.', 400));
  }

  const overlap = await TermM.findOne({
    where: {
      id: { [Op.ne]: row.id },
      [Op.or]: [
        {
          startDate: { [Op.lte]: payload.endDate },
          endDate: { [Op.gte]: payload.startDate },
        },
      ],
    },
  });
  if (overlap) {
    return next(
      new AppError('Rentang tanggal bertumpuk dengan term lain.', 400)
    );
  }

  await row.update(payload);
  res.status(200).json({ status: 'success', data: row });
});

/**
 * DELETE /terms/:id
 * Larang hapus jika sudah dipakai di:
 *  - grading_policies.termId
 *  - assessments.termId
 */
exports.deleteTerm = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const usedPolicy = await GradingPolicyM.count({ where: { termId: id } });
  if (usedPolicy > 0) {
    return next(
      new AppError('Tidak dapat menghapus: term sudah dipakai di Grading Policy.', 400)
    );
  }

  const usedAssessment = await AssessmentM.count({ where: { termId: id } });
  if (usedAssessment > 0) {
    return next(
      new AppError('Tidak dapat menghapus: term sudah dipakai di Assessment.', 400)
    );
  }

  const row = await TermM.findByPk(id);
  if (!row) return next(new AppError('Term tidak ditemukan.', 404));

  await row.destroy();
  res.status(204).json({ status: 'success', data: null });
});
