const express = require('express');
const kelasController = require('../controllers/kelasController');

const router = express.Router();

// CRUD kelas
router
  .route('/')
  .get(kelasController.getAllKelas) // GET semua kelas (support pagination + filter)
  .post(kelasController.createKelas); // POST buat kelas baru

// Tambah siswa batch ke kelas tertentu
router.route('/:id/students/batch').post(kelasController.addStudentsBatch);

router.route('/:id/students/move').patch(kelasController.moveStudents);

router
  .route('/:id')
  .get(kelasController.getKelas) // GET detail kelas by ID
  .patch(kelasController.updateKelas) // PATCH update kelas
  .delete(kelasController.deleteKelas); // DELETE kelas

router.get('/:id/students/not-in', kelasController.getStudentsNotInClass);

module.exports = router;
