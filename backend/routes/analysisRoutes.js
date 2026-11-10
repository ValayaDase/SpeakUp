const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrUpdateAnalysis,
  getAnalysisBySessionId,
} = require('../controllers/analysisController');

router.use(protect);

router.post('/:sessionId', createOrUpdateAnalysis);
router.get('/:sessionId', getAnalysisBySessionId);

module.exports = router;

