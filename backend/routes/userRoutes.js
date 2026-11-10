const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getProgress,
  deleteAccount,
} = require('../controllers/userController');

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/progress', getProgress);
router.delete('/account', deleteAccount);

module.exports = router;

