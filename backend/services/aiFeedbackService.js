const axios = require('axios');

/**
 * Format seconds into mm:ss
 */
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Generate AI Feedback using Gemini or OpenAI
 */
const generateFeedback = async ({
  scenario,
  scenarioCategory,
  difficulty,
  language,
  duration,
  transcript,
  speechMetrics,
  visualMetrics,
}) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Build the comprehensive analysis context
  const analysisContext = {
    scenario,
    category: scenarioCategory,
    difficulty,
    language,
    durationSeconds: duration,
    transcript: transcript.rawText || '',
    transcriptSegments: transcript.segments?.slice(0, 20) || [],
    speechMetrics: {
      wordsPerMinute: speechMetrics.wordsPerMinute,
      fillerWordCount: speechMetrics.fillerWords?.totalCount,
      fillerBreakdown: speechMetrics.fillerWords?.breakdown,
      longPauses: speechMetrics.longPauses?.totalCount,
      repeatedWords: speechMetrics.repeatedWords,
      lexicalDiversity: speechMetrics.vocabularyMetrics?.lexicalDiversity,
    },
    visualMetrics: visualMetrics?.isEnabled
      ? {
          handMovementFrequency: visualMetrics.handMovementFrequency,
          gestureActivity: visualMetrics.gestureActivity,
          postureStabilityScore: visualMetrics.postureStabilityScore,
          shoulderAlignment: visualMetrics.shoulderAlignment,
          headOrientation: visualMetrics.headOrientation,
          approximateGazePercentage: visualMetrics.approximateGazePercentage,
          observations: visualMetrics.observations?.slice(0, 10),
        }
      : 'Visual tracking was disabled by user.',
  };

  // 1. Try Gemini if configured
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      return await callGemini(geminiKey, analysisContext);
    } catch (err) {
      console.warn('Gemini API call failed, falling back if OpenAI available:', err.message);
    }
  }

  // 2. Try OpenAI if configured
  if (openaiKey && openaiKey.trim() !== '') {
    try {
      return await callOpenAI(openaiKey, analysisContext);
    } catch (err) {
      console.warn('OpenAI API call failed:', err.message);
    }
  }

  // 3. Fallback when keys are not configured or external service is unreachable
  return generateDeterministicFeedback(analysisContext);
};

/**
 * Call Gemini 2.5 Flash / 1.5 Flash
 */
const callGemini = async (apiKey, context) => {
  const prompt = `You are an expert communication coach analyzing a speaker's practice session for "${context.scenario}" (${context.category}, difficulty: ${context.difficulty}).
Return a valid JSON object strictly following this structure:
{
  "overallSummary": "2-3 concise sentences summarizing performance and presence",
  "communicationStrengths": ["specific strength 1 linked to facts", "specific strength 2"],
  "improvementAreas": ["specific constructive area 1", "specific constructive area 2"],
  "speechDeliveryFeedback": "Paragraph detailing cadence, articulation, filler usage, and pacing",
  "visualCommunicationObservations": "Paragraph discussing posture, hand gestures, and gaze consistency without claiming to read inner emotions",
  "contextSpecificSuggestions": ["Suggestion 1 specifically tailored to ${context.scenario}", "Suggestion 2"],
  "timestampLinkedFeedback": [
    {
      "timestamp": 15,
      "formattedTime": "00:15",
      "category": "speech",
      "observation": "Evidence-based note referencing words or action",
      "suggestion": "Actionable advice"
    }
  ],
  "recommendedExercises": [
    {
      "title": "Exercise Name",
      "description": "How to practice",
      "targetedSkill": "Pacing / Filler reduction / Posture"
    }
  ],
  "nextPracticeObjective": "Specific measurable goal for next session"
}

Important:
- MediaPipe provides landmarks, not emotional or personality scores. Do NOT claim to detect emotions, honesty, intelligence, or inner confidence.
- Be encouraging, practical, and grounded in the provided transcript and telemetry.

Data:
${JSON.stringify(context, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    },
    { timeout: 30000 }
  );

  const rawJson = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) throw new Error('No content received from Gemini');

  const parsed = JSON.parse(rawJson);
  parsed.aiProviderUsed = 'Google Gemini (gemini-2.5-flash)';
  return parsed;
};

/**
 * Call OpenAI API
 */
const callOpenAI = async (apiKey, context) => {
  const systemPrompt = `You are an expert communication coach on the SpeakUp platform. Return only valid JSON analyzing a user's practice session.
Structure:
{
  "overallSummary": "Concise summary",
  "communicationStrengths": ["string"],
  "improvementAreas": ["string"],
  "speechDeliveryFeedback": "string",
  "visualCommunicationObservations": "string",
  "contextSpecificSuggestions": ["string"],
  "timestampLinkedFeedback": [
    { "timestamp": 20, "formattedTime": "00:20", "category": "speech", "observation": "...", "suggestion": "..." }
  ],
  "recommendedExercises": [
    { "title": "...", "description": "...", "targetedSkill": "..." }
  ],
  "nextPracticeObjective": "string"
}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(context) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const rawJson = response.data?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(rawJson);
  parsed.aiProviderUsed = 'OpenAI (gpt-4o-mini)';
  return parsed;
};

/**
 * Deterministic evidence-based feedback generator
 * Used when external API keys are not supplied or network is unavailable
 */
const generateDeterministicFeedback = (context) => {
  const { speechMetrics, visualMetrics, transcript, durationSeconds, scenario } = context;
  const wpm = speechMetrics.wordsPerMinute || 0;
  const fillers = speechMetrics.fillerWordCount || 0;
  const longPauses = speechMetrics.longPauses || 0;

  const strengths = [];
  const improvements = [];
  const timestampFeedback = [];

  // Pacing evaluation
  if (wpm >= 115 && wpm <= 160) {
    strengths.push(`Well-regulated speaking pace at ${wpm} WPM, which lands in the optimal conversational zone.`);
  } else if (wpm < 115 && wpm > 0) {
    improvements.push(`Pacing is slightly deliberative (${wpm} WPM). Aim for 120-145 WPM for increased engagement.`);
  } else if (wpm > 160) {
    improvements.push(`High speaking cadence (${wpm} WPM). Slowing down periodically will help your listeners digest key arguments.`);
  }

  // Filler words evaluation
  if (fillers === 0 && speechMetrics.wordsPerMinute > 0) {
    strengths.push('Remarkable verbal cleanliness: zero prominent filler words detected during this segment.');
  } else if (fillers <= 3) {
    strengths.push(`Controlled filler word usage (${fillers} detected across ${Math.round(durationSeconds)}s).`);
  } else {
    improvements.push(`Detected ${fillers} filler words (${speechMetrics.fillerBreakdown?.map((f) => f.word).join(', ') || 'um/uh'}). Replace them with intentional micro-pauses.`);
  }

  // Visual observations
  let visualNotes = 'Visual camera tracking was disabled or minimal movement observed.';
  if (visualMetrics && typeof visualMetrics === 'object') {
    const gaze = visualMetrics.approximateGazePercentage || 80;
    const posture = visualMetrics.postureStabilityScore || 75;

    if (gaze >= 75) {
      strengths.push(`Direct forward orientation: approximately ${gaze}% direct camera focal engagement.`);
    } else {
      improvements.push(`Focal alignment shifted occasionally (${gaze}% direct line-of-sight). Try centering your camera at eye level.`);
    }

    visualNotes = `Visual landmark analysis indicated a ${visualMetrics.gestureActivity?.toLowerCase() || 'moderate'} gesture frequency (${visualMetrics.handMovementFrequency || 0} gestures/min) with a ${visualMetrics.shoulderAlignment || 'balanced'} shoulder frame and ${posture}% posture stability.`;
  }

  // If transcript has segments with fillers or pauses, attach timestamps
  if (speechMetrics.fillerBreakdown && speechMetrics.fillerBreakdown.length > 0) {
    speechMetrics.fillerBreakdown.forEach((f) => {
      if (f.timestamps && f.timestamps.length > 0) {
        const timeSec = f.timestamps[0];
        timestampFeedback.push({
          timestamp: timeSec,
          formattedTime: formatTime(timeSec),
          category: 'speech',
          observation: `Cluster of "${f.word}" noticed near this timestamp.`,
          suggestion: 'Breathe out and embrace silent transition rather than vocalized filler.',
        });
      }
    });
  }

  if (timestampFeedback.length === 0) {
    const midPoint = Math.max(10, Math.floor(durationSeconds / 2));
    timestampFeedback.push({
      timestamp: midPoint,
      formattedTime: formatTime(midPoint),
      category: 'pacing',
      observation: `Mid-session pacing check (${wpm} words per minute).`,
      suggestion: 'Re-anchor your posture and take a 1-second pause before delivering the key takeaway.',
    });
  }

  return {
    overallSummary: `Solid practice session for "${scenario}". Your overall delivery was coherent with an observed cadence of ${wpm} WPM and ${fillers} detected filler utterances.`,
    communicationStrengths: strengths.length > 0 ? strengths : ['Clear voice delivery and committed attempt at the scenario.'],
    improvementAreas: improvements.length > 0 ? improvements : ['Continue practicing transitions and maintaining steady eye contact.'],
    speechDeliveryFeedback: `Your speech articulation achieved a clarity index of ${speechMetrics.clarityScore || 75}/100. Pacing was measured at ${wpm} WPM over ${Math.round(durationSeconds)} seconds. ${longPauses > 0 ? `Noticed ${longPauses} extended pause intervals.` : 'Pauses were well distributed.'}`,
    visualCommunicationObservations: visualNotes,
    contextSpecificSuggestions: [
      `For ${scenario}, prioritize structuring your responses using the PREP (Point, Reason, Example, Point) framework.`,
      `Keep your hands visible in the upper torso quadrant to signal openness and engagement.`,
    ],
    timestampLinkedFeedback: timestampFeedback.slice(0, 4),
    recommendedExercises: [
      {
        title: 'The 2-Second Intentional Pause',
        description: 'Whenever you feel the urge to say "um" or "like", close your lips and take a silent 2-second breath.',
        targetedSkill: 'Filler Reduction & Composure',
      },
      {
        title: 'Pacing Metronome Drill',
        description: 'Read a short passage at 135 WPM to build muscle memory for optimal conversational cadence.',
        targetedSkill: 'Cadence Control',
      },
    ],
    nextPracticeObjective: `Practice "${scenario}" once more, aiming to keep filler words under 2 and gaze stability above 85%.`,
    aiProviderUsed: 'SpeakUp Rule-Based Telemetry Engine (Configure GEMINI_API_KEY for dynamic LLM feedback)',
  };
};

module.exports = {
  generateFeedback,
};

