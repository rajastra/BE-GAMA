const express = require('express');
const presensiController = require('../controllers/presensiController');

const router = express.Router();

router
  .route('/')
  .get(presensiController.getAllPresensi)
  .post(presensiController.createPresensi);

router.route('/recap').get(presensiController.getRecap);

router
  .route('/:id')
  .get(presensiController.getPresensi)
  .patch(presensiController.updatePresensi)
  .delete(presensiController.deletePresensi);

module.exports = router;
