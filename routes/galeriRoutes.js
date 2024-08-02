const express = require('express');
const galeriController = require('../controllers/galeriController');

const router = express.Router();

router
  .route('/')
  .get(galeriController.getAllGaleri)
  .post(galeriController.createGaleri);

router
  .route('/:id')
  .get(galeriController.getGaleri)
  .patch(galeriController.updateGaleri)
  .delete(galeriController.deleteGaleri);

module.exports = router;
