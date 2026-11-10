const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
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
      unique: true,
      index: true,
    },
    transcript: {
      rawText: { type: String, default: '' },
      languageDetected: { type: String, default: 'en' },
      segments: [
        {
          start: { type: Number, default: 0 },
          end: { type: Number, default: 0 },
          text: { type: String, default: '' },
        },
      ],
    },
    speechMetrics: {
      wordsPerMinute: { type: Number, default: 0 },
      totalWords: { type: Number, default: 0 },
      speechDuration: { type: Number, default: 0 },
      fillerWords: {
        totalCount: { type: Number, default: 0 },
        breakdown: [
          {
            word: { type: String },
            count: { type: Number, default: 0 },
            timestamps: [{ type: Number }],
          },
        ],
      },
      longPauses: {
        totalCount: { type: Number, default: 0 },
        averagePauseSeconds: { type: Number, default: 0 },
        timestamps: [{ type: Number }],
      },
      repeatedWords: [
        {
          phrase: { type: String },
          count: { type: Number, default: 0 },
        },
      ],
      volumeVariation: {
        averageRms: { type: Number, default: 0 },
        peakVolumeDb: { type: Number, default: 0 },
        volumeDynamicRange: { type: String, default: 'Moderate' },
      },
      clarityScore: { type: Number, min: 0, max: 100, default: 75 },
      vocabularyMetrics: {
        uniqueWords: { type: Number, default: 0 },
        lexicalDiversity: { type: Number, default: 0 }, // Type-Token Ratio
      },
    },
    visualMetrics: {
      isEnabled: { type: Boolean, default: true },
      handMovementFrequency: { type: Number, default: 0 }, // movements/min
      gestureActivity: { type: String, default: 'Moderate' }, // Low, Moderate, High
      gestureConsistencyScore: { type: Number, default: 70 },
      postureStabilityScore: { type: Number, default: 75 },
      shoulderAlignment: { type: String, default: 'Balanced' },
      headOrientation: { type: String, default: 'Centered' },
      approximateGazePercentage: { type: Number, default: 80 },
      observations: [
        {
          timestamp: { type: Number },
          formattedTime: { type: String },
          signal: { type: String },
          observation: { type: String },
        },
      ],
    },
    feedback: {
      overallSummary: { type: String, default: '' },
      communicationStrengths: [{ type: String }],
      improvementAreas: [{ type: String }],
      speechDeliveryFeedback: { type: String, default: '' },
      visualCommunicationObservations: { type: String, default: '' },
      contextSpecificSuggestions: [{ type: String }],
      timestampLinkedFeedback: [
        {
          timestamp: { type: Number },
          formattedTime: { type: String },
          category: { type: String, enum: ['speech', 'visual', 'pacing', 'content'] },
          observation: { type: String },
          suggestion: { type: String },
        },
      ],
      recommendedExercises: [
        {
          title: { type: String },
          description: { type: String },
          targetedSkill: { type: String },
        },
      ],
      nextPracticeObjective: { type: String, default: '' },
      aiProviderUsed: { type: String, default: 'gemini' },
    },
  },
  {
    timestamps: true,
  }
);

analysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);

