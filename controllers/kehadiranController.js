// controllers/kehadiranController.js
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Kehadiran = require('../models/kehadiranModel');
const Kelas = require('../models/kelasModel');
const Siswa = require('../models/siswaModel');

// GET /kehadiran/harian?classId=&date=YYYY-MM-DD
exports.getHarianByClass = catchAsync(async (req, res, next) => {
  // --- range tanggal ---
  const from = (req.query.from || '').trim();
  const to = (req.query.to || '').trim();
  const today = dayjs().format('YYYY-MM-DD');

  let dateFilter;
  if (from || to) {
    // normalisasi: jika hanya salah satu diisi, pakai batas lawannya = from/to = today
    const start = from || today;
    const end = to || today;

    // validasi ringan format (opsional)
    if (
      !dayjs(start, 'YYYY-MM-DD', true).isValid() ||
      !dayjs(end, 'YYYY-MM-DD', true).isValid()
    ) {
      return next(new AppError('Format tanggal harus YYYY-MM-DD.', 400));
    }
    if (dayjs(start).isAfter(dayjs(end))) {
      return next(
        new AppError('Parameter "from" tidak boleh lebih besar dari "to".', 400)
      );
    }

    dateFilter = { [Op.between]: [start, end] }; // DATEONLY aman
  } else {
    // default: hari ini
    dateFilter = today;
  }

  // --- filter lain ---
  const classId = req.query.classId || null;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(limitRaw || 10, 1), 100);
  const offset = (page - 1) * limit;

  const keyword = (req.query.keyword || req.query.q || '').trim();

  // --- where utama ---
  const where = { date: dateFilter };
  if (classId) where.kelasId = classId;

  // --- include + filter nama siswa ---
  const include = [
    {
      model: Siswa,
      as: 'siswa',
      attributes: ['id', 'name', 'nis', 'gender'],
      where: keyword ? { name: { [Op.iLike]: `%${keyword}%` } } : undefined, // ganti ke Op.like jika MySQL
      required: true,
    },
    {
      model: Kelas,
      as: 'kelas',
      attributes: ['id', 'name', 'grade'],
      required: false,
    },
  ];

  // validasi kelas jika difilter
  let kelas = null;
  if (classId) {
    kelas = await Kelas.findByPk(classId, {
      attributes: ['id', 'name', 'grade'],
    });
    if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));
  }

  // --- query + pagination ---
  const { rows, count } = await Kehadiran.findAndCountAll({
    where,
    include,
    order: [
      ['date', 'DESC'],
      [{ model: Siswa, as: 'siswa' }, 'name', 'ASC'],
    ],
    limit,
    offset,
    distinct: true,
    subQuery: false,
  });

  const totalPages = Math.max(Math.ceil(count / limit), 1);

  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      range: {
        from: from || today,
        to: to || today,
        defaulted: !(from || to), // true jika auto-hari-ini
      },
      class: kelas, // null jika tidak kirim classId
      rows,
    },
    meta: {
      total: count,
      per_page: limit,
      current_page: page,
      total_pages: totalPages,
      has_prev: page > 1,
      has_next: page < totalPages,
      query: { classId: classId || null, keyword: keyword || null },
    },
  });
});

// POST /kehadiran/harian
// body: { classId, date?, items: [{ siswaId, status, note? }] }
exports.upsertHarianByClass = catchAsync(async (req, res, next) => {
  const { classId, date, items } = req.body || {};
  if (!classId) return next(new AppError('classId wajib diisi.', 400));
  if (!Array.isArray(items) || items.length === 0)
    return next(
      new AppError('"items" harus array dan tidak boleh kosong.', 400)
    );

  const theDate = date || dayjs().format('YYYY-MM-DD');

  // optional: validasi kelas tersisa
  const kelas = await Kelas.findByPk(classId, { attributes: ['id'] });
  if (!kelas) return next(new AppError('Kelas tidak ditemukan.', 404));

  // (opsional) ambil siswa anggota kelas utk validasi – jika kamu menyimpan di kolom siswa.kelasId:
  const siswaIds = items.map((it) => it.siswaId);
  const validStudents = await Siswa.findAll({
    where: { id: { [Op.in]: siswaIds }, kelasId: classId },
    attributes: ['id'],
  });
  const allowed = new Set(validStudents.map((s) => s.id));
  const payload = items.filter((it) => allowed.has(it.siswaId));

  if (payload.length === 0) {
    return next(new AppError('Tidak ada siswa valid untuk kelas ini.', 400));
  }

  // upsert satu per satu – karena ada unique (classId, siswaId, date)
  // gunakan transaction untuk konsistensi
  const t = await Kehadiran.sequelize.transaction();
  try {
    let affected = 0;
    for (const it of payload) {
      const [row, created] = await Kehadiran.findOrCreate({
        where: { kelasId: classId, siswaId: it.siswaId, date: theDate },
        defaults: {
          kelasId: classId,
          siswaId: it.siswaId,
          date: theDate,
          status: it.status,
          note: it.note || null,
        },
        transaction: t,
      });

      if (!created) {
        // update kalau berubah
        const needUpdate =
          row.status !== it.status || (it.note ?? null) !== (row.note ?? null);
        if (needUpdate) {
          row.status = it.status;
          row.note = it.note ?? row.note;
          await row.save({ transaction: t });
          affected++;
        }
      } else {
        affected++;
      }
    }
    await t.commit();
    res.status(200).json({
      status: 'success',
      message: `Tersimpan ${affected} data.`,
      date: theDate,
    });
  } catch (err) {
    await t.rollback();
    // tangani bentrok unique constraint
    return next(new AppError(err.message, 400));
  }
});

// GET /kehadiran/rekap?classId=&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.rekapByClassRange = catchAsync(async (req, res, next) => {
  const { classId, from, to } = req.query;
  if (!classId) return next(new AppError('classId wajib diisi.', 400));

  const where = { classId };
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to) where.date[Op.lte] = to;
  }

  const rows = await Kehadiran.findAll({
    where,
    include: [{ model: Siswa, as: 'siswa', attributes: ['id', 'name', 'nis'] }],
  });

  // agregasi sederhana per siswa
  const map = new Map();
  for (const r of rows) {
    const k = r.siswaId;
    if (!map.has(k))
      map.set(k, {
        siswaId: k,
        name: r.siswa?.name,
        nis: r.siswa?.nis,
        present: 0,
        excused: 0,
        sick: 0,
        absent: 0,
        late: 0,
      });
    map.get(k)[r.status]++;
  }

  res.status(200).json({
    status: 'success',
    data: {
      classId,
      range: { from: from || null, to: to || null },
      summary: [...map.values()],
    },
  });
});

// GET /kehadiran/siswa/:siswaId?from=&to=
exports.listBySiswa = catchAsync(async (req, res, next) => {
  const { siswaId } = req.params;
  const { from, to } = req.query;

  const where = { siswaId };
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to) where.date[Op.lte] = to;
  }

  const rows = await Kehadiran.findAll({
    where,
    include: [
      { model: Kelas, as: 'kelas', attributes: ['id', 'name', 'grade'] },
    ],
    order: [['date', 'DESC']],
  });

  res.status(200).json({ status: 'success', data: rows });
});

// DELETE /kehadiran/:id
exports.deleteOne = catchAsync(async (req, res, next) => {
  const row = await Kehadiran.findByPk(req.params.id);
  if (!row) return next(new AppError('Data presensi tidak ditemukan.', 404));
  await row.destroy();
  res.status(204).json({ status: 'success', data: null });
});

exports.updateOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, note } = req.body || {};

  // validasi minimal: harus ada salah satu field yang diupdate
  if (typeof status === 'undefined' && typeof note === 'undefined') {
    return next(
      new AppError(
        'Tidak ada perubahan dikirim. Sertakan "status" atau "note".',
        400
      )
    );
  }

  // Validasi nilai status (harus sama seperti ENUM di model)
  const ALLOWED_STATUS = ['present', 'excused', 'sick', 'absent', 'late'];
  if (typeof status !== 'undefined' && !ALLOWED_STATUS.includes(status)) {
    return next(
      new AppError(
        `Status tidak valid. Gunakan salah satu: ${ALLOWED_STATUS.join(', ')}`,
        400
      )
    );
  }

  const row = await Kehadiran.findByPk(id);
  if (!row) return next(new AppError('Data presensi tidak ditemukan.', 404));

  // Update aman—hanya field yang diizinkan
  if (typeof status !== 'undefined') row.status = status;
  if (typeof note !== 'undefined') row.note = note;

  await row.save();

  res.status(200).json({
    status: 'success',
    data: row,
  });
});
