const express = require('express');
const izinController = require('../controllers/izinController');

const router = express.Router();

router
  .route('/')
  .get(izinController.getAllIzin)
  .post(izinController.createIzin);

router
  .route('/:id')
  .get(izinController.getIzin)
  .patch(izinController.updateIzin)
  .delete(izinController.deleteIzin);

router.route('/:id/status').patch(izinController.updateStatusIzin);

module.exports = router;
