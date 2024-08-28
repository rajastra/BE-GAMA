const express = require('express');
const documentController = require('../controllers/documentController');

const router = express.Router();

router
  .route('/')
  .get(documentController.getAllDocument)
  .post(documentController.createDocument);

router
  .route('/:id')
  .get(documentController.getDocument)
  .delete(documentController.deleteDocument);

module.exports = router;
