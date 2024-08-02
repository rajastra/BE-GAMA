const express = require('express');
const indikatorController = require('../controllers/indikatorController');

const router = express.Router();

router
  .route('/')
  .get(indikatorController.getAllIndikator)
  .post(indikatorController.createIndikator);

router
  .route('/:id')
  .get(indikatorController.getIndikator)
  .patch(indikatorController.updateIndikator)
  .delete(indikatorController.deleteIndikator);

module.exports = router;
