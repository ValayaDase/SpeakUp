const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scenario: {
      type: String,
      required: [true, 'Scenario is required'],
      trim: true,
    },
    scenarioCategory: {
      type: String,
      enum: ['Professional', 'Personal and Social', 'Content Creation', 'Custom'],
      default: 'Professional',
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    language: {
      type: String,
      enum: ['English', 'Hindi', 'Marathi', 'Hinglish'],
      default: 'English',
    },
    duration: {
      type: Number, // In seconds
      default: 0,
    },
    targetDuration: {
      type: Number, // In seconds (e.g., 60, 180, 300)
      default: 180,
    },
    status: {
      type: String,
      enum: ['created', 'recording', 'completed', 'analyzing', 'analyzed', 'cancelled'],
      default: 'created',
      index: true,
    },
    mode: {
      type: String,
      enum: ['solo_practice', 'ai_partner'],
      default: 'solo_practice',
    },
    aiConversation: [
      {
        role: {
          type: String,
          enum: ['system', 'ai', 'user'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Number,
          default: 0,
        },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);

