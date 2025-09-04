const { Op } = require('sequelize');
const dayjs = require('dayjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const SubjectM = require('../models/subjectModel');
const KelasM = require('../models/kelasModel');
const ClassSubjectM = require('../models/classSubjectModel');
const TermM = require('../models/termModel');
const GradingPolicyM = require('../models/gradingPolicyModel');

exports.listClassSubjects = catchAsync(async (req, res, next) => {
  const { classId } = req.params;
  const {
    q = '',
    page = 1,
    limit = 10,
    sortBy = 'subject.name',
    sortDir = 'ASC',
    all = 'false',
  } = req.query;

  const kelas = await KelasM.findByPk(classId, { attributes: ['id', 'name'] });
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  // ===== Filter keyword pada subject (code/name)
  const keyword = q.trim();
  const where = {
    classId,
    ...(keyword && {
      [Op.or]: [
        { '$subject.code$': { [Op.iLike]: `%${keyword}%` } },
        { '$subject.name$': { [Op.iLike]: `%${keyword}%` } },
      ],
    }),
  };

  // ===== Include subject
  const include = [
    {
      model: SubjectM,
      as: 'subject',
      attributes: ['id', 'code', 'name'],
      required: false, // tetap tampil meski subject null (kalau model memungkinkan)
    },
  ];

  // ===== Whitelist kolom sorting
  // dukung: subject.name, subject.code, createdAt, updatedAt
  const sortable = new Set([
    'subject.name',
    'subject.code',
    'createdAt',
    'updatedAt',
  ]);
  const chosen = sortable.has(String(sortBy)) ? String(sortBy) : 'subject.name';
  const dir = String(sortDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // mapping order
  const order = chosen.startsWith('subject.')
    ? [[{ model: SubjectM, as: 'subject' }, chosen.split('.')[1], dir]]
    : [[chosen, dir]];

  // ===== Mode non-pagination (all=true)
  if (all === 'true') {
    const rows = await ClassSubjectM.findAll({
      where,
      include,
      order,
      subQuery: false,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        class: kelas, // { id, name }
        rows,
      },
      meta: { mode: 'all', total: rows.length },
    });
  }

  // ===== Mode pagination (default)
  const pageNum = parseInt(page, 10) || 1;
  const perPage = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * perPage;

  const { rows, count: total } = await ClassSubjectM.findAndCountAll({
    where,
    include,
    order,
    limit: perPage,
    offset,
    distinct: true, // penting saat ada include agar count akurat
    subQuery: false, // bantu order by include + limit
  });

  res.status(200).json({
    status: 'success',
    data: {
      class: kelas, // { id, name }
      rows,
    },
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

// POST /classes/:classId/subjects { subjectId }
exports.addClassSubject = catchAsync(async (req, res, next) => {
  const { classId } = req.params;
  const { subjectId } = req.body;
  if (!subjectId) return next(new AppError('subjectId wajib.', 400));

  const kelas = await KelasM.findByPk(classId);
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  const subj = await SubjectM.findByPk(subjectId);
  if (!subj) return next(new AppError('Subject tidak ditemukan.', 404));

  const row = await ClassSubjectM.create({
    classId,
    subjectId,
    teacherId: null,
  });
  res.status(201).json({ status: 'success', data: row });
});

// DELETE /class-subjects/:id
exports.deleteClassSubject = catchAsync(async (req, res, next) => {
  const row = await ClassSubjectM.findByPk(req.params.id);
  if (!row) return next(new AppError('Data tidak ditemukan.', 404));
  await row.destroy();
  res.status(204).json({ status: 'success' });
});

// PUT /class-subjects/:id/grading-policy
exports.setGradingPolicy = catchAsync(async (req, res, next) => {
  const { id } = req.params; // classSubjectId
  const { termId, policyJson, kkm } = req.body;

  if (!termId || !policyJson)
    return next(new AppError('termId & policyJson wajib.', 400));
  const cs = await ClassSubjectM.findByPk(id);
  if (!cs) return next(new AppError('ClassSubject tidak ditemukan.', 404));
  const term = await TermM.findByPk(termId);
  if (!term) return next(new AppError('Term tidak ditemukan.', 404));

  // validasi total bobot = 100
  const total = Object.values(policyJson || {})
    .map(Number)
    .reduce((a, b) => a + b, 0);
  if (total !== 100)
    return next(new AppError('Total bobot policy harus 100.', 400));

  const [row] = await GradingPolicyM.upsert(
    {
      classSubjectId: id,
      termId,
      policyJson,
      kkm: Number.isFinite(+kkm) ? +kkm : 75,
      effectiveFrom: dayjs().format('YYYY-MM-DD'),
    },
    { returning: true }
  );

  res.json({ status: 'success', data: row });
});

// GET /class-subjects/:id/grading-policy?termId=
exports.getGradingPolicy = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { termId } = req.query;
  if (!termId) return next(new AppError('termId wajib.', 400));
  const row = await GradingPolicyM.findOne({
    where: { classSubjectId: id, termId },
  });
  if (!row) return next(new AppError('Policy belum diset.', 404));
  res.json({ status: 'success', data: row });
});
