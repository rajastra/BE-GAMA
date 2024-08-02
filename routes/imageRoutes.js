const express = require('express');
const imageController = require('../controllers/imageController');

const router = express.Router();

router
  .route('/')
  .post(imageController.uploadImage, imageController.createImage);

module.exports = router;
