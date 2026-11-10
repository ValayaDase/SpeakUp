const Analysis = require('../models/Analysis');
const Session = require('../models/Session');
const Recording = require('../models/Recording');
const { analyzeSpeech } = require('../services/speechAnalysisService');
const { generateFeedback } = require('../services/aiFeedbackService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Perform multimodal speech + visual analysis and generate feedback
// @route   POST /api/analysis/:sessionId
// @access  Private
const createOrUpdateAnalysis = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { transcript, visualMetrics, audioMeasurements } = req.body;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'Practice session not found or unauthorized.');
    }

    const recording = await Recording.findOne({ sessionId: session._id });
    const effectiveDuration = session.duration || recording?.duration || 60;

    // 1. Compute objective speech metrics
    const computedSpeech = analyzeSpeech(
      transcript?.rawText || '',
      transcript?.segments || [],
      effectiveDuration,
      audioMeasurements
    );

    // 2. Prepare visual metrics data
    const normalizedVisualMetrics = visualMetrics || {
      isEnabled: false,
      handMovementFrequency: 0,
      gestureActivity: 'Disabled',
      gestureConsistencyScore: 0,
      postureStabilityScore: 0,
      shoulderAlignment: 'Neutral',
      headOrientation: 'Centered',
      approximateGazePercentage: 0,
      observations: [],
    };

    // 3. Generate structured AI / telemetry feedback
    const aiFeedback = await generateFeedback({
      scenario: session.scenario,
      scenarioCategory: session.scenarioCategory,
      difficulty: session.difficulty,
      language: session.language,
      duration: effectiveDuration,
      transcript: transcript || { rawText: '', segments: [] },
      speechMetrics: computedSpeech,
      visualMetrics: normalizedVisualMetrics,
    });

    // 4. Save or update Analysis model in database
    let analysis = await Analysis.findOne({ sessionId: session._id });

    if (analysis) {
      analysis.transcript = transcript || analysis.transcript;
      analysis.speechMetrics = computedSpeech;
      analysis.visualMetrics = normalizedVisualMetrics;
      analysis.feedback = aiFeedback;
      await analysis.save();
    } else {
      analysis = await Analysis.create({
        userId: req.user._id,
        sessionId: session._id,
        transcript: transcript || { rawText: '', segments: [] },
        speechMetrics: computedSpeech,
        visualMetrics: normalizedVisualMetrics,
        feedback: aiFeedback,
      });
    }

    // Update session status
    session.status = 'analyzed';
    await session.save();

    return sendSuccess(res, 200, 'Analysis completed successfully', {
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analysis report for session
// @route   GET /api/analysis/:sessionId
// @access  Private
const getAnalysisBySessionId = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'Session not found.');
    }

    const analysis = await Analysis.findOne({
      sessionId: session._id,
      userId: req.user._id,
    });

    if (!analysis) {
      return sendError(res, 404, 'No analysis report found for this session yet.');
    }

    return sendSuccess(res, 200, 'Analysis retrieved', { analysis });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateAnalysis,
  getAnalysisBySessionId,
};

