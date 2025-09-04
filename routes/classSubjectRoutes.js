const express = require('express');
const classSubjectController = require('../controllers/classSubjectController');
const assesmentController = require('../controllers/assesmentController');

const router = express.Router();

router.get('/classes/:classId/subjects', classSubjectController.listClassSubjects);
router.post('/classes/:classId/subjects', classSubjectController.addClassSubject);
router.delete('/class-subjects/:id', classSubjectController.deleteClassSubject);

router.put('/class-subjects/:id/grading-policy', classSubjectController.setGradingPolicy);
router.get('/class-subjects/:id/grading-policy', classSubjectController.getGradingPolicy);

// Assessments & scores
router.get('/class-subjects/:id/assessments', assesmentController.listAssessments);
router.post('/class-subjects/:id/assessments', assesmentController.createAssessment);

module.exports = router;
