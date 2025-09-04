/*****************************************************************************************
 * MODELS
 *****************************************************************************************/

// models/Subject.js
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Subject = sequelize.define('Subject', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
}, { tableName: 'subjects', timestamps: true });

module.exports = Subject;

// models/Term.js (semester/periode)
const { DataTypes: DT2 } = require('sequelize');
const sequelize2 = require('../utils/database');

const Term = sequelize2.define('Term', {
  id: { type: DT2.UUID, defaultValue: DT2.UUIDV4, primaryKey: true },
  name: { type: DT2.STRING(50), allowNull: false },          // "Ganjil 2025/2026"
  year: { type: DT2.STRING(20), allowNull: true },           // "2025/2026"
  startDate: { type: DT2.DATEONLY, allowNull: true },
  endDate: { type: DT2.DATEONLY, allowNull: true },
}, { tableName: 'terms', timestamps: true });

module.exports = Term;

// models/ClassSubject.js (penugasan mapel ke kelas - tanpa guru wajib)
const { DataTypes: DT3 } = require('sequelize');
const sequelize3 = require('../utils/database');
const Kelas = require('../models/kelasModel');             // existing
const Subject3 = require('./Subject');

const ClassSubject = sequelize3.define('ClassSubject', {
  id: { type: DT3.UUID, defaultValue: DT3.UUIDV4, primaryKey: true },
  classId: { type: DT3.UUID, allowNull: false },
  subjectId: { type: DT3.UUID, allowNull: false },
  teacherId: { type: DT3.UUID, allowNull: true },           // opsional
}, {
  tableName: 'class_subjects',
  timestamps: true,
  indexes: [{ unique: true, fields: ['classId', 'subjectId'] }]
});

ClassSubject.belongsTo(Kelas, { as: 'class', foreignKey: 'classId' });
ClassSubject.belongsTo(Subject3, { as: 'subject', foreignKey: 'subjectId' });
Kelas.hasMany(ClassSubject, { as: 'classSubjects', foreignKey: 'classId' });

module.exports = ClassSubject;

// models/GradingPolicy.js
const { DataTypes: DT4 } = require('sequelize');
const sequelize4 = require('../utils/database');
const ClassSubject4 = require('./ClassSubject');
const Term4 = require('./Term');

const GradingPolicy = sequelize4.define('GradingPolicy', {
  id: { type: DT4.UUID, defaultValue: DT4.UUIDV4, primaryKey: true },
  classSubjectId: { type: DT4.UUID, allowNull: false },
  termId: { type: DT4.UUID, allowNull: false },
  policyJson: { type: DT4.JSONB, allowNull: false },        // {task:30, quiz:20, uts:25, uas:25}
  kkm: { type: DT4.INTEGER, allowNull: false, defaultValue: 75 },
  effectiveFrom: { type: DT4.DATEONLY, allowNull: false, defaultValue: DT4.NOW },
}, {
  tableName: 'grading_policies',
  timestamps: true,
  indexes: [{ unique: true, fields: ['classSubjectId', 'termId'] }]
});
GradingPolicy.belongsTo(ClassSubject4, { as: 'classSubject', foreignKey: 'classSubjectId' });
GradingPolicy.belongsTo(Term4, { as: 'term', foreignKey: 'termId' });

module.exports = GradingPolicy;

// models/Assessment.js
const { DataTypes: DT5 } = require('sequelize');
const sequelize5 = require('../utils/database');
const ClassSubject5 = require('./ClassSubject');
const Term5 = require('./Term');

const Assessment = sequelize5.define('Assessment', {
  id: { type: DT5.UUID, defaultValue: DT5.UUIDV4, primaryKey: true },
  classSubjectId: { type: DT5.UUID, allowNull: false },
  termId: { type: DT5.UUID, allowNull: false },
  title: { type: DT5.STRING(160), allowNull: false },
  type: { type: DT5.ENUM('task','quiz','uts','uas','project','practical'), allowNull: false },
  weight: { type: DT5.DECIMAL(5,2), allowNull: false, defaultValue: 0 }, // opsional
  dueDate: { type: DT5.DATEONLY, allowNull: true },
  isPublished: { type: DT5.BOOLEAN, allowNull: false, defaultValue: false },
  state: { type: DT5.ENUM('draft','locked','published'), allowNull: false, defaultValue: 'draft' },
}, { tableName: 'assessments', timestamps: true });

Assessment.belongsTo(ClassSubject5, { as: 'classSubject', foreignKey: 'classSubjectId' });
Assessment.belongsTo(Term5, { as: 'term', foreignKey: 'termId' });

module.exports = Assessment;

// models/Score.js
const { DataTypes: DT6 } = require('sequelize');
const sequelize6 = require('../utils/database');
const Assessment6 = require('./Assessment');
const Siswa = require('../models/siswaModel');              // existing

const Score = sequelize6.define('Score', {
  id: { type: DT6.UUID, defaultValue: DT6.UUIDV4, primaryKey: true },
  assessmentId: { type: DT6.UUID, allowNull: false },
  studentId: { type: DT6.UUID, allowNull: false },
  score: { type: DT6.DECIMAL(6,2), allowNull: false },
  note: { type: DT6.STRING(255), allowNull: true },
}, {
  tableName: 'scores',
  timestamps: true,
  indexes: [{ unique: true, fields: ['assessmentId', 'studentId'] }]
});

Score.belongsTo(Assessment6, { as: 'assessment', foreignKey: 'assessmentId' });
Score.belongsTo(Siswa, { as: 'student', foreignKey: 'studentId' });

module.exports = Score;


/*****************************************************************************************
 * CONTROLLER (Academic / Grading)
 *****************************************************************************************/
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const SubjectM = require('../models/Subject');
const TermM = require('../models/Term');
const ClassSubjectM = require('../models/ClassSubject');
const GradingPolicyM = require('../models/GradingPolicy');
const AssessmentM = require('../models/Assessment');
const ScoreM = require('../models/Score');

const KelasM = require('../models/kelasModel');             // existing
const SiswaM = require('../models/siswaModel');             // existing

/* ============================= SUBJECTS ============================= */

// GET /subjects?q=
exports.listSubjects = catchAsync(async (req, res) => {
  const q = (req.query.q || '').trim();
  const where = q ? { [Op.or]: [{ code: { [Op.iLike]: `%${q}%` } }, { name: { [Op.iLike]: `%${q}%` } }] } : {};
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

/* ====================== CLASS-SUBJECT & POLICY ====================== */

// GET /classes/:classId/subjects
exports.listClassSubjects = catchAsync(async (req, res, next) => {
  const { classId } = req.params;
  const kelas = await KelasM.findByPk(classId);
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  const rows = await ClassSubjectM.findAll({
    where: { classId },
    include: [{ model: SubjectM, as: 'subject', attributes: ['id', 'code', 'name'] }],
    order: [[{ model: SubjectM, as: 'subject' }, 'name', 'ASC']],
  });

  res.json({ status: 'success', data: { class: { id: kelas.id, name: kelas.name }, rows } });
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

  const row = await ClassSubjectM.create({ classId, subjectId, teacherId: null });
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

  if (!termId || !policyJson) return next(new AppError('termId & policyJson wajib.', 400));
  const cs = await ClassSubjectM.findByPk(id);
  if (!cs) return next(new AppError('ClassSubject tidak ditemukan.', 404));
  const term = await TermM.findByPk(termId);
  if (!term) return next(new AppError('Term tidak ditemukan.', 404));

  // validasi total bobot = 100
  const total = Object.values(policyJson || {}).map(Number).reduce((a, b) => a + b, 0);
  if (total !== 100) return next(new AppError('Total bobot policy harus 100.', 400));

  const [row] = await GradingPolicyM.upsert({
    classSubjectId: id,
    termId,
    policyJson,
    kkm: Number.isFinite(+kkm) ? +kkm : 75,
    effectiveFrom: dayjs().format('YYYY-MM-DD'),
  }, { returning: true });

  res.json({ status: 'success', data: row });
});

// GET /class-subjects/:id/grading-policy?termId=
exports.getGradingPolicy = catchAsync(async (req, res, next) => {
  const { id } = req.params; const { termId } = req.query;
  if (!termId) return next(new AppError('termId wajib.', 400));
  const row = await GradingPolicyM.findOne({ where: { classSubjectId: id, termId } });
  if (!row) return next(new AppError('Policy belum diset.', 404));
  res.json({ status: 'success', data: row });
});

/* ========================= ASSESSMENTS ========================= */

// GET /class-subjects/:id/assessments?termId=
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

/* ============================ SCORES ============================ */

// GET /assessments/:id/scores?keyword=&page=&limit=
exports.listScores = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { keyword = '', page = 1, limit = 25 } = req.query;
  const _page = Math.max(parseInt(page, 10) || 1, 1);
  const _limit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
  const offset = (_page - 1) * _limit;

  const assessment = await AssessmentM.findByPk(id, { include: [{ model: ClassSubjectM, as: 'classSubject' }] });
  if (!assessment) return next(new AppError('Assessment tidak ditemukan.', 404));
  const classId = assessment.classSubject.classId;

  const whereStudent = { kelasId: classId };
  if (keyword) whereStudent.name = { [Op.iLike]: `%${keyword}%` };

  // ambil siswa (paginated)
  const { rows: students, count: total } = await SiswaM.findAndCountAll({
    where: whereStudent, order: [['name', 'ASC']], limit: _limit, offset
  });

  // ambil skor existing utk siswa di halaman ini
  const scores = await ScoreM.findAll({
    where: { assessmentId: id, studentId: { [Op.in]: students.map(s => s.id) } }
  });
  const scoreMap = new Map(scores.map(s => [s.studentId, s]));

  const rows = students.map(s => ({
    studentId: s.id, nis: s.nis, name: s.name,
    score: scoreMap.get(s.id)?.score ?? null,
    scoreId: scoreMap.get(s.id)?.id ?? null,
    note: scoreMap.get(s.id)?.note ?? null
  }));

  res.json({
    status: 'success',
    data: rows,
    meta: { total, per_page: _limit, current_page: _page, total_pages: Math.max(Math.ceil(total/_limit),1) }
  });
});

// POST /assessments/:id/scores { items: [{studentId, score, note?}] }
exports.bulkUpsertScores = catchAsync(async (req, res, next) => {
  const { id } = req.params; const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return next(new AppError('"items" tidak boleh kosong.', 400));

  const assessment = await AssessmentM.findByPk(id);
  if (!assessment) return next(new AppError('Assessment tidak ditemukan.', 404));

  const t = await ScoreM.sequelize.transaction();
  try {
    let affected = 0;
    for (const it of items) {
      const [row, created] = await ScoreM.findOrCreate({
        where: { assessmentId: id, studentId: it.studentId },
        defaults: { assessmentId: id, studentId: it.studentId, score: it.score, note: it.note || null },
        transaction: t
      });
      if (!created) {
        row.score = it.score;
        row.note = it.note ?? row.note;
        await row.save({ transaction: t });
      }
      affected++;
    }
    await t.commit();
    res.json({ status: 'success', updated: affected });
  } catch (e) {
    await t.rollback();
    return next(new AppError(e.message, 400));
  }
});

// PATCH /scores/:id { score?, note? }
exports.patchScore = catchAsync(async (req, res, next) => {
  const row = await ScoreM.findByPk(req.params.id);
  if (!row) return next(new AppError('Score tidak ditemukan.', 404));
  if (req.body.score !== undefined) row.score = req.body.score;
  if (req.body.note !== undefined) row.note = req.body.note;
  await row.save();
  res.json({ status: 'success', data: row });
});

/* ========================= FINAL & RAPOR ========================= */

// GET /class-subjects/:id/final-scores?termId=&page=&limit=&keyword=
exports.getFinalScores = catchAsync(async (req, res, next) => {
  const { id } = req.params; const { termId, page = 1, limit = 25, keyword = '' } = req.query;
  if (!termId) return next(new AppError('termId wajib.', 400));

  const policy = await GradingPolicyM.findOne({ where: { classSubjectId: id, termId } });
  if (!policy) return next(new AppError('Policy belum diset.', 400));
  const weights = policy.policyJson || {}; // {task:30,...}
  const kkm = policy.kkm || 75;

  const assessments = await AssessmentM.findAll({ where: { classSubjectId: id, termId } });
  const byTypeIds = {};
  for (const a of assessments) {
    (byTypeIds[a.type] ??= []).push(a.id);
  }

  const cs = await ClassSubjectM.findByPk(id);
  if (!cs) return next(new AppError('ClassSubject tidak ditemukan.', 404));
  const classId = cs.classId;

  const whereStudent = { kelasId: classId };
  if (keyword) whereStudent.name = { [Op.iLike]: `%${keyword}%` };
  const _page = Math.max(parseInt(page, 10) || 1, 1);
  const _limit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const offset = (_page - 1) * _limit;

  const { rows: students, count: total } = await SiswaM.findAndCountAll({
    where: whereStudent, order: [['name', 'ASC']], limit: _limit, offset
  });

  const allIds = assessments.map(a => a.id);
  const allScores = await ScoreM.findAll({ where: { assessmentId: { [Op.in]: allIds } } });
  const index = {};
  for (const sc of allScores) {
    const a = assessments.find(x => x.id === sc.assessmentId);
    if (!a) continue;
    index[sc.studentId] ??= {};
    index[sc.studentId][a.type] ??= [];
    index[sc.studentId][a.type].push(Number(sc.score));
  }

  const rows = students.map(st => {
    const perType = index[st.id] || {};
    let final = 0; const parts = {};
    for (const [type, wt] of Object.entries(weights)) {
      const arr = perType[type] || [];
      const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
      parts[type] = Number(avg.toFixed(2));
      final += avg * (Number(wt) || 0) / 100;
    }
    final = Number(final.toFixed(2));
    const status = final >= kkm ? 'Tuntas' : 'Belum';
    return { studentId: st.id, nis: st.nis, name: st.name, components: parts, final, kkm, status };
  });

  res.json({
    status: 'success',
    data: rows,
    meta: { total, per_page: _limit, current_page: _page, total_pages: Math.max(Math.ceil(total/_limit),1) }
  });
});

// GET /reports/report-card?classId=&termId=&format=xlsx
exports.exportClassReportXlsx = catchAsync(async (req, res, next) => {
  const { classId, termId } = req.query;
  if (!classId || !termId) return next(new AppError('classId & termId wajib.', 400));

  const kelas = await KelasM.findByPk(classId);
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  // semua class-subject kelas ini
  const csList = await ClassSubjectM.findAll({
    where: { classId },
    include: [{ model: SubjectM, as: 'subject', attributes: ['id','name'] }]
  });

  // ambil siswa
  const students = await SiswaM.findAll({ where: { kelasId: classId }, order: [['name','ASC']] });

  // workbook
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rapor');

  // header
  ws.addRow([`RAPOR KELAS ${kelas.name} - TERM ${termId}`]);
  ws.addRow([]);
  ws.addRow(['NIS', 'Nama', ...csList.map(cs => cs.subject.name), 'Rerata', 'Status']);
  ws.getRow(3).font = { bold: true };

  // cache final score per mapel
  const finalMap = {};
  for (const cs of csList) {
    // hitung final untuk semua siswa mapel ini
    const policy = await GradingPolicyM.findOne({ where: { classSubjectId: cs.id, termId } });
    const weights = policy?.policyJson || {};
    const kkm = policy?.kkm || 75;

    const assessments = await AssessmentM.findAll({ where: { classSubjectId: cs.id, termId } });
    const allIds = assessments.map(a => a.id);
    const scores = await ScoreM.findAll({ where: { assessmentId: { [Op.in]: allIds } } });

    const byStudentType = {};
    for (const sc of scores) {
      const a = assessments.find(x => x.id === sc.assessmentId);
      if (!a) continue;
      byStudentType[sc.studentId] ??= {};
      byStudentType[sc.studentId][a.type] ??= [];
      byStudentType[sc.studentId][a.type].push(Number(sc.score));
    }

    finalMap[cs.id] = { kkm, weights, byStudentType, assessments };
  }

  for (const s of students) {
    const finals = [];
    for (const cs of csList) {
      const entry = finalMap[cs.id];
      const perType = entry.byStudentType[s.id] || {};
      let value = 0;
      for (const [type, wt] of Object.entries(entry.weights)) {
        const arr = perType[type] || [];
        const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
        value += avg * (Number(wt)||0) / 100;
      }
      finals.push(Number(value.toFixed(2)));
    }
    const avgAll = finals.length ? Number((finals.reduce((a,b)=>a+b,0)/finals.length).toFixed(2)) : 0;
    const status = avgAll >= 75 ? 'Naik/Tuntas' : 'Perbaikan';
    ws.addRow([s.nis, s.name, ...finals, avgAll, status]);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="rapor-${kelas.name}-${termId}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});


/*****************************************************************************************
 * ROUTES
 *****************************************************************************************/

const express = require('express');
const router = express.Router();

// Subjects
router.get('/subjects', exports.listSubjects);
router.post('/subjects', exports.createSubject);
router.patch('/subjects/:id', exports.updateSubject);
router.delete('/subjects/:id', exports.deleteSubject);

// Terms (opsional CRUD minimal)
router.get('/terms', catchAsync(async (req, res) => {
  const rows = await TermM.findAll({ order: [['createdAt','DESC']] });
  res.json({ status:'success', data: rows });
}));
router.post('/terms', catchAsync(async (req, res, next) => {
  const { name, year, startDate, endDate } = req.body;
  if (!name) return next(new AppError('name wajib.', 400));
  const row = await TermM.create({ name, year, startDate, endDate });
  res.status(201).json({ status:'success', data: row });
}));

// Class-Subject assignment + policy
router.get('/classes/:classId/subjects', exports.listClassSubjects);
router.post('/classes/:classId/subjects', exports.addClassSubject);
router.delete('/class-subjects/:id', exports.deleteClassSubject);

router.put('/class-subjects/:id/grading-policy', exports.setGradingPolicy);
router.get('/class-subjects/:id/grading-policy', exports.getGradingPolicy);

// Assessments & scores
router.get('/class-subjects/:id/assessments', exports.listAssessments);
router.post('/class-subjects/:id/assessments', exports.createAssessment);
router.patch('/assessments/:id', exports.updateAssessment);
router.post('/assessments/:id/lock', exports.lockAssessment);
router.post('/assessments/:id/publish', exports.publishAssessment);
router.delete('/assessments/:id', exports.deleteAssessment);

router.get('/assessments/:id/scores', exports.listScores);
router.post('/assessments/:id/scores', exports.bulkUpsertScores);
router.patch('/scores/:id', exports.patchScore);

// Final & report
router.get('/class-subjects/:id/final-scores', exports.getFinalScores);
router.get('/reports/report-card', exports.exportClassReportXlsx);

// export router
module.exports = router;

/*****************************************************************************************
 * CATATAN PEMAKAIAN
 * - Mount routes ini di server: app.use('/api/v1/academic', require('./routes/academicRoutes'));
 * - Jalankan sync/migration untuk tabel baru.
 * - Pastikan model Kelas & Siswa sudah ada (field minimal: Siswa{id, name, nis, kelasId}).
 *****************************************************************************************/
