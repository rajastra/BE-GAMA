const express = require('express');
const regulasiController = require('../controllers/regulasiController');

const router = express.Router();

router
  .route('/')
  .get(regulasiController.getAllRegulasi)
  .post(regulasiController.createRegulasi);

router
  .route('/:id')
  .get(regulasiController.getRegulasi)
  .patch(regulasiController.updateRegulasi)
  .delete(regulasiController.deleteRegulasi);

module.exports = router;
