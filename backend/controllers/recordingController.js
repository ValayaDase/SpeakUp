const fs = require('fs');
const path = require('path');
const Recording = require('../models/Recording');
const Session = require('../models/Session');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Upload recording linked to a session
// @route   POST /api/recordings/upload
// @access  Private
const uploadRecording = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No recording file provided.');
    }

    const { sessionId, duration, fileType } = req.body;

    if (!sessionId) {
      // Clean up uploaded file if sessionId is missing
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 400, 'Session ID is required.');
    }

    // Verify session ownership
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 404, 'Associated session not found or unauthorized.');
    }

    // Remove any previous recording for this session if it exists
    const existingRecording = await Recording.findOne({ sessionId: session._id });
    if (existingRecording && existingRecording.filePath && fs.existsSync(existingRecording.filePath)) {
      try {
        fs.unlinkSync(existingRecording.filePath);
      } catch (e) {
        console.warn('Error removing old recording file:', e.message);
      }
      await Recording.deleteOne({ _id: existingRecording._id });
    }

    // Create recording record
    const recording = await Recording.create({
      userId: req.user._id,
      sessionId: session._id,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: fileType || (req.file.mimetype.startsWith('video/') ? 'video' : 'audio'),
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      duration: duration ? parseFloat(duration) : 0,
    });

    // Update session duration & status
    if (duration) {
      session.duration = Math.round(parseFloat(duration));
    }
    session.status = 'completed';
    await session.save();

    return sendSuccess(res, 201, 'Recording uploaded successfully', {
      recording: {
        _id: recording._id,
        sessionId: recording.sessionId,
        fileName: recording.fileName,
        fileType: recording.fileType,
        mimeType: recording.mimeType,
        duration: recording.duration,
        fileSize: recording.fileSize,
        createdAt: recording.createdAt,
      },
    });
  } catch (error) {
    // Clean up temporary file on failure
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }
    next(error);
  }
};

// @desc    Stream or download recording (Strict ownership check)
// @route   GET /api/recordings/:recordingId
// @access  Private
const getRecordingStream = async (req, res, next) => {
  try {
    const { recordingId } = req.params;

    const recording = await Recording.findOne({
      _id: recordingId,
      userId: req.user._id,
    });

    if (!recording) {
      return sendError(res, 404, 'Recording not found or access denied.');
    }

    if (!fs.existsSync(recording.filePath)) {
      return sendError(res, 404, 'Recording file does not exist on storage.');
    }

    const stat = fs.statSync(recording.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(recording.filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': recording.mimeType || 'video/webm',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': recording.mimeType || 'video/webm',
        'Content-Disposition': `inline; filename="${recording.fileName}"`,
      };
      res.writeHead(200, head);
      fs.createReadStream(recording.filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a recording
// @route   DELETE /api/recordings/:recordingId
// @access  Private
const deleteRecording = async (req, res, next) => {
  try {
    const { recordingId } = req.params;

    const recording = await Recording.findOne({
      _id: recordingId,
      userId: req.user._id,
    });

    if (!recording) {
      return sendError(res, 404, 'Recording not found.');
    }

    if (recording.filePath && fs.existsSync(recording.filePath)) {
      try {
        fs.unlinkSync(recording.filePath);
      } catch (err) {
        console.warn('Failed to delete physical file:', err.message);
      }
    }

    await Recording.deleteOne({ _id: recording._id });

    return sendSuccess(res, 200, 'Recording deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadRecording,
  getRecordingStream,
  deleteRecording,
};

