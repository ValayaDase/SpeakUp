const fs = require('fs');
const User = require('../models/User');
const Session = require('../models/Session');
const Recording = require('../models/Recording');
const Analysis = require('../models/Analysis');
const { clearTokenCookie } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return sendSuccess(res, 200, 'Profile retrieved', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & preferences
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, preferredLanguage, communicationGoals, practicePreferences, privacySettings } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (name) user.name = name.trim();
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (communicationGoals && Array.isArray(communicationGoals)) user.communicationGoals = communicationGoals;
    if (practicePreferences) {
      user.practicePreferences = {
        ...user.practicePreferences.toObject(),
        ...practicePreferences,
      };
    }
    if (privacySettings) {
      user.privacySettings = {
        ...user.privacySettings.toObject(),
        ...privacySettings,
      };
    }

    await user.save();

    return sendSuccess(res, 200, 'Profile updated successfully', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        communicationGoals: user.communicationGoals,
        practicePreferences: user.practicePreferences,
        privacySettings: user.privacySettings,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get longitudinal communication progress from actual records
// @route   GET /api/users/progress
// @access  Private
const getProgress = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Fetch all user sessions
    const sessions = await Session.find({ userId }).sort({ createdAt: 1 }).lean();
    const totalSessions = sessions.length;

    // Total speaking time in seconds
    const totalSpeakingTimeSeconds = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    // 2. Fetch all corresponding analyses
    const sessionIds = sessions.map((s) => s._id);
    const analyses = await Analysis.find({ sessionId: { $in: sessionIds } })
      .populate('sessionId', 'scenario scenarioCategory createdAt duration')
      .sort({ createdAt: 1 })
      .lean();

    // 3. Chronological timeline metrics for Recharts
    const timelineData = analyses.map((a) => {
      const sessionDate = a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Session';
      return {
        id: a.sessionId?._id || a._id,
        date: sessionDate,
        scenario: a.sessionId?.scenario || 'Practice',
        category: a.sessionId?.scenarioCategory || 'Professional',
        durationSeconds: a.speechMetrics?.speechDuration || a.sessionId?.duration || 0,
        wordsPerMinute: a.speechMetrics?.wordsPerMinute || 0,
        fillerCount: a.speechMetrics?.fillerWords?.totalCount || 0,
        pauseCount: a.speechMetrics?.longPauses?.totalCount || 0,
        clarityScore: a.speechMetrics?.clarityScore || 70,
        postureScore: a.visualMetrics?.postureStabilityScore || 70,
        gazePercent: a.visualMetrics?.approximateGazePercentage || 80,
      };
    });

    // 4. Scenario-wise performance aggregate
    const scenarioMap = {};
    timelineData.forEach((item) => {
      if (!scenarioMap[item.scenario]) {
        scenarioMap[item.scenario] = {
          scenario: item.scenario,
          count: 0,
          avgWpm: 0,
          totalWpm: 0,
          avgFillers: 0,
          totalFillers: 0,
          avgClarity: 0,
          totalClarity: 0,
        };
      }
      const s = scenarioMap[item.scenario];
      s.count += 1;
      s.totalWpm += item.wordsPerMinute;
      s.totalFillers += item.fillerCount;
      s.totalClarity += item.clarityScore;
      s.avgWpm = Math.round(s.totalWpm / s.count);
      s.avgFillers = parseFloat((s.totalFillers / s.count).toFixed(1));
      s.avgClarity = Math.round(s.totalClarity / s.count);
    });

    // 5. Category breakdown
    const categoryCounts = {
      Professional: 0,
      'Personal and Social': 0,
      'Content Creation': 0,
      Custom: 0,
    };
    sessions.forEach((s) => {
      if (categoryCounts[s.scenarioCategory] !== undefined) {
        categoryCounts[s.scenarioCategory] += 1;
      }
    });

    // 6. Recent highlights
    const latestAnalysis = analyses[analyses.length - 1] || null;
    const previousAnalysis = analyses.length > 1 ? analyses[analyses.length - 2] : null;

    return sendSuccess(res, 200, 'Progress analytics retrieved', {
      totalSessions,
      totalSpeakingTimeSeconds,
      timelineData,
      scenarioPerformance: Object.values(scenarioMap),
      categoryCounts,
      latestAnalysis,
      previousAnalysis,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account and all personal recordings & data (GDPR compliant)
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Remove all physical recordings from disk
    const recordings = await Recording.find({ userId });
    recordings.forEach((rec) => {
      if (rec.filePath && fs.existsSync(rec.filePath)) {
        try {
          fs.unlinkSync(rec.filePath);
        } catch (e) {
          console.warn('Could not delete file:', rec.filePath);
        }
      }
    });

    // Delete database records
    await Recording.deleteMany({ userId });
    await Analysis.deleteMany({ userId });
    await Session.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    clearTokenCookie(res);

    return sendSuccess(res, 200, 'Account and all personal recordings successfully deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProgress,
  deleteAccount,
};

