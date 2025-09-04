const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const AssessmentM = require('../models/assesmentModel');

exports.listAssessments = catchAsync(async (req, res, next) => {
  const { id } = req.params; const { termId } = req.query;
  if (!termId) return next(new AppError('termId wajib.', 400));
  const rows = await AssessmentM.findAll({
    where: { classSubjectId: id, termId },
    order: [['createdAt', 'DESC']]
  });
  res.json({ status: 'success', data: rows });
});

// POST /class-subjects/:id/assessments
exports.createAssessment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { termId, title, type, weight = 0, dueDate } = req.body;
  if (!termId || !title || !type) return next(new AppError('termId, title, type wajib.', 400));
  const cs = await ClassSubjectM.findByPk(id);
  if (!cs) return next(new AppError('ClassSubject tidak ditemukan.', 404));
  const row = await AssessmentM.create({ classSubjectId: id, termId, title, type, weight, dueDate });
  res.status(201).json({ status: 'success', data: row });
});

// PATCH /assessments/:id
exports.updateAssessment = catchAsync(async (req, res, next) => {
  const row = await AssessmentM.findByPk(req.params.id);
  if (!row) return next(new AppError('Assessment tidak ditemukan.', 404));
  await row.update(req.body);
  res.json({ status: 'success', data: row });
});

// POST /assessments/:id/lock
exports.lockAssessment = catchAsync(async (req, res, next) => {
  const row = await AssessmentM.findByPk(req.params.id);
  if (!row) return next(new AppError('Assessment tidak ditemukan.', 404));
  row.state = 'locked'; await row.save();
  res.json({ status: 'success', data: row });
});

// POST /assessments/:id/publish
exports.publishAssessment = catchAsync(async (req, res, next) => {
  const row = await AssessmentM.findByPk(req.params.id);
  if (!row) return next(new AppError('Assessment tidak ditemukan.', 404));
  row.state = 'published'; row.isPublished = true; await row.save();
  res.json({ status: 'success', data: row });
});

// DELETE /assessments/:id
exports.deleteAssessment = catchAsync(async (req, res, next) => {
  const row = await AssessmentM.findByPk(req.params.id);
  if (!row) return next(new AppError('Assessment tidak ditemukan.', 404));
  await row.destroy();
  res.status(204).json({ status: 'success' });
});