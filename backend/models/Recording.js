const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['video', 'audio'],
      default: 'video',
    },
    mimeType: {
      type: String,
      default: 'video/webm',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // In seconds
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

recordingSchema.index({ userId: 1, sessionId: 1 });

module.exports = mongoose.model('Recording', recordingSchema);

