const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  handleAiPartnerTurn,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').post(createSession).get(getSessions);
router.post('/:sessionId/ai-chat', handleAiPartnerTurn);
router.route('/:sessionId').get(getSessionById).put(updateSession).delete(deleteSession);

module.exports = router;
