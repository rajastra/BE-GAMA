const express = require('express');
const termController = require('../controllers/termController');

const router = express.Router();

// CRUD term
router
  .route('/')
  .get(termController.getAllTerms)
  .post(termController.createTerm);

router
  .route('/:id')
  .get(termController.getTerm)
  .patch(termController.updateTerm)
  .delete(termController.deleteTerm);

module.exports = router;
