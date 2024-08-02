const express = require('express');
const beritaController = require('../controllers/productController');

const router = express.Router();

router
  .route('/')
  .get(beritaController.getAllProduct)
  .post(beritaController.uploadProductPhoto, beritaController.createProduct);

router
  .route('/:id')
  .get(beritaController.getProduct)
  .patch(beritaController.uploadProductPhoto, beritaController.updateProduct)
  .delete(beritaController.deleteProduct);

module.exports = router;
