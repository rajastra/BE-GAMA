const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const AssessmentM = require('../models/assesmentModel');
const ScoreM = require('../models/scoreModel');
const GradingPolicyM = require('../models/gradingPolicyModel');

exports.listScores = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { keyword = '', page = 1, limit = 25 } = req.query;
  const _page = Math.max(parseInt(page, 10) || 1, 1);
  const _limit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
  const offset = (_page - 1) * _limit;

  const assessment = await AssessmentM.findByPk(id, {
    include: [{ model: ClassSubjectM, as: 'classSubject' }],
  });
  if (!assessment)
    return next(new AppError('Assessment tidak ditemukan.', 404));
  const classId = assessment.classSubject.classId;

  const whereStudent = { kelasId: classId };
  if (keyword) whereStudent.name = { [Op.iLike]: `%${keyword}%` };

  // ambil siswa (paginated)
  const { rows: students, count: total } = await SiswaM.findAndCountAll({
    where: whereStudent,
    order: [['name', 'ASC']],
    limit: _limit,
    offset,
  });

  // ambil skor existing utk siswa di halaman ini
  const scores = await ScoreM.findAll({
    where: {
      assessmentId: id,
      studentId: { [Op.in]: students.map((s) => s.id) },
    },
  });
  const scoreMap = new Map(scores.map((s) => [s.studentId, s]));

  const rows = students.map((s) => ({
    studentId: s.id,
    nis: s.nis,
    name: s.name,
    score: scoreMap.get(s.id)?.score ?? null,
    scoreId: scoreMap.get(s.id)?.id ?? null,
    note: scoreMap.get(s.id)?.note ?? null,
  }));

  res.json({
    status: 'success',
    data: rows,
    meta: {
      total,
      per_page: _limit,
      current_page: _page,
      total_pages: Math.max(Math.ceil(total / _limit), 1),
    },
  });
});

// POST /assessments/:id/scores { items: [{studentId, score, note?}] }
exports.bulkUpsertScores = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return next(new AppError('"items" tidak boleh kosong.', 400));

  const assessment = await AssessmentM.findByPk(id);
  if (!assessment)
    return next(new AppError('Assessment tidak ditemukan.', 404));

  const t = await ScoreM.sequelize.transaction();
  try {
    let affected = 0;
    for (const it of items) {
      const [row, created] = await ScoreM.findOrCreate({
        where: { assessmentId: id, studentId: it.studentId },
        defaults: {
          assessmentId: id,
          studentId: it.studentId,
          score: it.score,
          note: it.note || null,
        },
        transaction: t,
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

exports.getFinalScores = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { termId, page = 1, limit = 25, keyword = '' } = req.query;
  if (!termId) return next(new AppError('termId wajib.', 400));

  const policy = await GradingPolicyM.findOne({
    where: { classSubjectId: id, termId },
  });
  if (!policy) return next(new AppError('Policy belum diset.', 400));
  const weights = policy.policyJson || {}; // {task:30,...}
  const kkm = policy.kkm || 75;

  const assessments = await AssessmentM.findAll({
    where: { classSubjectId: id, termId },
  });
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
    where: whereStudent,
    order: [['name', 'ASC']],
    limit: _limit,
    offset,
  });

  const allIds = assessments.map((a) => a.id);
  const allScores = await ScoreM.findAll({
    where: { assessmentId: { [Op.in]: allIds } },
  });
  const index = {};
  for (const sc of allScores) {
    const a = assessments.find((x) => x.id === sc.assessmentId);
    if (!a) continue;
    index[sc.studentId] ??= {};
    index[sc.studentId][a.type] ??= [];
    index[sc.studentId][a.type].push(Number(sc.score));
  }

  const rows = students.map((st) => {
    const perType = index[st.id] || {};
    let final = 0;
    const parts = {};
    for (const [type, wt] of Object.entries(weights)) {
      const arr = perType[type] || [];
      const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      parts[type] = Number(avg.toFixed(2));
      final += (avg * (Number(wt) || 0)) / 100;
    }
    final = Number(final.toFixed(2));
    const status = final >= kkm ? 'Tuntas' : 'Belum';
    return {
      studentId: st.id,
      nis: st.nis,
      name: st.name,
      components: parts,
      final,
      kkm,
      status,
    };
  });

  res.json({
    status: 'success',
    data: rows,
    meta: {
      total,
      per_page: _limit,
      current_page: _page,
      total_pages: Math.max(Math.ceil(total / _limit), 1),
    },
  });
});

// GET /reports/report-card?classId=&termId=&format=xlsx
exports.exportClassReportXlsx = catchAsync(async (req, res, next) => {
  const { classId, termId } = req.query;
  if (!classId || !termId)
    return next(new AppError('classId & termId wajib.', 400));

  const kelas = await KelasM.findByPk(classId);
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  // semua class-subject kelas ini
  const csList = await ClassSubjectM.findAll({
    where: { classId },
    include: [{ model: SubjectM, as: 'subject', attributes: ['id', 'name'] }],
  });

  // ambil siswa
  const students = await SiswaM.findAll({
    where: { kelasId: classId },
    order: [['name', 'ASC']],
  });

  // workbook
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rapor');

  // header
  ws.addRow([`RAPOR KELAS ${kelas.name} - TERM ${termId}`]);
  ws.addRow([]);
  ws.addRow([
    'NIS',
    'Nama',
    ...csList.map((cs) => cs.subject.name),
    'Rerata',
    'Status',
  ]);
  ws.getRow(3).font = { bold: true };

  // cache final score per mapel
  const finalMap = {};
  for (const cs of csList) {
    // hitung final untuk semua siswa mapel ini
    const policy = await GradingPolicyM.findOne({
      where: { classSubjectId: cs.id, termId },
    });
    const weights = policy?.policyJson || {};
    const kkm = policy?.kkm || 75;

    const assessments = await AssessmentM.findAll({
      where: { classSubjectId: cs.id, termId },
    });
    const allIds = assessments.map((a) => a.id);
    const scores = await ScoreM.findAll({
      where: { assessmentId: { [Op.in]: allIds } },
    });

    const byStudentType = {};
    for (const sc of scores) {
      const a = assessments.find((x) => x.id === sc.assessmentId);
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
        const avg = arr.length
          ? arr.reduce((a, b) => a + b, 0) / arr.length
          : 0;
        value += (avg * (Number(wt) || 0)) / 100;
      }
      finals.push(Number(value.toFixed(2)));
    }
    const avgAll = finals.length
      ? Number((finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(2))
      : 0;
    const status = avgAll >= 75 ? 'Naik/Tuntas' : 'Perbaikan';
    ws.addRow([s.nis, s.name, ...finals, avgAll, status]);
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="rapor-${kelas.name}-${termId}.xlsx"`
  );
  await wb.xlsx.write(res);
  res.end();
});
