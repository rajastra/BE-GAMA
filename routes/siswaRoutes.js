const express = require('express');
const siswaController = require('../controllers/siswaController');

const router = express.Router();

router
  .route('/')
  .get(siswaController.getAllSiswa)
  .post(siswaController.createSiswa);

router
  .route('/:id')
  .get(siswaController.getSiswa)
  .patch(siswaController.updateSiswa)
  .delete(siswaController.deleteSiswa);

module.exports = router;
