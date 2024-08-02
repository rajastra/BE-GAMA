const express = require('express');
const fileController = require('../controllers/fileController');

const router = express.Router();

router.route('/').post(fileController.uploadFile, fileController.createFile);

module.exports = router;
