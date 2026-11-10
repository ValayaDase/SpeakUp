const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  uploadRecording,
  getRecordingStream,
  deleteRecording,
} = require('../controllers/recordingController');

router.use(protect);

router.post('/upload', upload.single('recording'), uploadRecording);
router.get('/:recordingId', getRecordingStream);
router.delete('/:recordingId', deleteRecording);

module.exports = router;

