const express = require('express');
const kehadiranController = require('../controllers/kehadiranController');

const router = express.Router();

// GET daftar presensi harian (default hari ini; classId opsional)
router.get('/harian', kehadiranController.getHarianByClass);

// POST /kehadiran/harian  → input/upsert presensi 1 kelas di 1 tanggal
router.post('/harian', kehadiranController.upsertHarianByClass);

// PATCH /kehadiran/:id  → koreksi 1 data presensi
router.patch('/:id', kehadiranController.updateOne);

// GET /kehadiran/rekap?classId=&from=&to= → rekap presensi per kelas dalam range tanggal
router.get('/rekap', kehadiranController.rekapByClassRange);

// GET /kehadiran/siswa/:siswaId?from=&to= → histori presensi per siswa
router.get('/siswa/:siswaId', kehadiranController.listBySiswa);

// DELETE /kehadiran/:id → hapus 1 record presensi
router.delete('/:id', kehadiranController.deleteOne);

module.exports = router;
