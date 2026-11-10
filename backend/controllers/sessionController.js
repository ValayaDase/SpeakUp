const fs = require('fs');
const path = require('path');
const Session = require('../models/Session');
const Recording = require('../models/Recording');
const Analysis = require('../models/Analysis');
const { generateNextTurn } = require('../services/aiPartnerService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Create a new practice session
// @route   POST /api/sessions
// @access  Private
const createSession = async (req, res, next) => {
  try {
    const { scenario, scenarioCategory, difficulty, language, targetDuration, mode, notes } = req.body;

    if (!scenario) {
      return sendError(res, 400, 'Scenario title is required.');
    }

    const session = await Session.create({
      userId: req.user._id,
      scenario: scenario.trim(),
      scenarioCategory: scenarioCategory || 'Professional',
      difficulty: difficulty || 'Intermediate',
      language: language || req.user.preferredLanguage || 'English',
      targetDuration: targetDuration ? parseInt(targetDuration, 10) : 180,
      mode: mode || 'solo_practice',
      notes: notes || '',
      status: 'created',
    });

    return sendSuccess(res, 201, 'Practice session initiated', { session });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's practice sessions
// @route   GET /api/sessions
// @access  Private
const getSessions = async (req, res, next) => {
  try {
    const { status, category, difficulty, limit = 20, page = 1 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (category) query.scenarioCategory = category;
    if (difficulty) query.difficulty = difficulty;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [sessions, totalCount] = await Promise.all([
      Session.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Session.countDocuments(query),
    ]);

    // Attach analysis summary if available
    const sessionIds = sessions.map((s) => s._id);
    const analyses = await Analysis.find({ sessionId: { $in: sessionIds } })
      .select('sessionId speechMetrics.wordsPerMinute speechMetrics.fillerWords visualMetrics feedback.overallSummary feedback.recommendedExercises')
      .lean();

    const analysisMap = {};
    analyses.forEach((a) => {
      analysisMap[a.sessionId.toString()] = a;
    });

    const enrichedSessions = sessions.map((s) => ({
      ...s,
      analysis: analysisMap[s._id.toString()] || null,
    }));

    return sendSuccess(res, 200, 'Sessions retrieved', {
      sessions: enrichedSessions,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        pages: Math.ceil(totalCount / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single session details with recording & analysis
// @route   GET /api/sessions/:sessionId
// @access  Private
const getSessionById = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'Session not found.');
    }

    const [recording, analysis] = await Promise.all([
      Recording.findOne({ sessionId: session._id }),
      Analysis.findOne({ sessionId: session._id }),
    ]);

    return sendSuccess(res, 200, 'Session retrieved successfully', {
      session,
      recording: recording
        ? {
            _id: recording._id,
            fileName: recording.fileName,
            fileType: recording.fileType,
            duration: recording.duration,
            fileSize: recording.fileSize,
            createdAt: recording.createdAt,
          }
        : null,
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update session (duration, status, notes)
// @route   PUT /api/sessions/:sessionId
// @access  Private
const updateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status, duration, notes } = req.body;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'Session not found.');
    }

    if (status) session.status = status;
    if (duration !== undefined) session.duration = Number(duration);
    if (notes !== undefined) session.notes = notes;

    await session.save();

    return sendSuccess(res, 200, 'Session updated', { session });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete session and its associated files & analysis
// @route   DELETE /api/sessions/:sessionId
// @access  Private
const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'Session not found.');
    }

    // Find and delete recording file from disk
    const recording = await Recording.findOne({ sessionId: session._id });
    if (recording && recording.filePath) {
      if (fs.existsSync(recording.filePath)) {
        try {
          fs.unlinkSync(recording.filePath);
        } catch (unlinkErr) {
          console.warn('Could not delete recording file:', unlinkErr.message);
        }
      }
      await Recording.deleteOne({ _id: recording._id });
    }

    // Delete analysis document
    await Analysis.deleteOne({ sessionId: session._id });

    // Delete session document
    await Session.deleteOne({ _id: session._id });

    return sendSuccess(res, 200, 'Session and associated data deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Interactive AI conversation partner turn
// @route   POST /api/sessions/:sessionId/ai-chat
// @access  Private
const handleAiPartnerTurn = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { userMessage } = req.body;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'Session not found.');
    }

    // Add user message if provided
    if (userMessage && userMessage.trim()) {
      session.aiConversation.push({
        role: 'user',
        content: userMessage.trim(),
        timestamp: Date.now(),
      });
    }

    // If conversation is empty, generate opening line
    const history = session.aiConversation.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const aiReply = await generateNextTurn({
      scenario: session.scenario,
      category: session.scenarioCategory,
      difficulty: session.difficulty,
      language: session.language,
      conversationHistory: history,
    });

    session.aiConversation.push({
      role: 'ai',
      content: aiReply,
      timestamp: Date.now(),
    });

    await session.save();

    return sendSuccess(res, 200, 'AI response generated', {
      reply: aiReply,
      conversation: session.aiConversation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  handleAiPartnerTurn,
};
