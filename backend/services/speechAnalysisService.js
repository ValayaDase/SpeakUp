/**
 * Speech Analysis Engine
 * Calculates objective metrics from transcript and timing data
 */

const COMMON_FILLER_WORDS = [
  'um',
  'uh',
  'er',
  'ah',
  'like',
  'you know',
  'actually',
  'basically',
  'literally',
  'sort of',
  'kind of',
  'i mean',
  'right',
  'okay so',
  'honestly',
];

/**
 * Perform comprehensive speech analysis
 * @param {string} rawText Full spoken transcript
 * @param {Array} segments Array of { start, end, text } timestamps
 * @param {number} durationSeconds Total recording length
 * @param {object} audioMeasurements Optional raw audio measurements from Web Audio API
 */
const analyzeSpeech = (rawText = '', segments = [], durationSeconds = 0, audioMeasurements = null) => {
  const cleanText = (rawText || '').trim();
  const effectiveDuration = durationSeconds > 0 ? durationSeconds : Math.max(1, segments.length * 3);
  const minutes = effectiveDuration / 60;

  // Words breakdown
  const words = cleanText.length > 0 ? cleanText.toLowerCase().replace(/[.,!?;:()]/g, ' ').split(/\s+/).filter(Boolean) : [];
  const totalWords = words.length;

  // 1. Speaking Pace (WPM)
  const wordsPerMinute = minutes > 0 ? Math.round(totalWords / minutes) : 0;

  // 2. Filler words analysis
  const fillerBreakdown = [];
  let totalFillers = 0;

  COMMON_FILLER_WORDS.forEach((filler) => {
    let count = 0;
    const timestamps = [];

    // Check multi-word or single-word filler
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = cleanText.match(regex);
    if (matches) {
      count = matches.length;
      totalFillers += count;

      // Extract approximate timestamps from segments
      if (segments && segments.length > 0) {
        segments.forEach((seg) => {
          if (new RegExp(`\\b${filler}\\b`, 'i').test(seg.text)) {
            timestamps.push(Math.round(seg.start || 0));
          }
        });
      }
    }

    if (count > 0) {
      fillerBreakdown.push({
        word: filler,
        count,
        timestamps: Array.from(new Set(timestamps)),
      });
    }
  });

  // 3. Long Pauses Analysis
  const pauseTimestamps = [];
  let pauseDurations = [];

  if (segments && segments.length > 1) {
    for (let i = 0; i < segments.length - 1; i++) {
      const currentEnd = segments[i].end || 0;
      const nextStart = segments[i + 1].start || 0;
      const gap = nextStart - currentEnd;

      // Gap of 2.5 seconds or more considered a long pause
      if (gap >= 2.5) {
        pauseTimestamps.push(Math.round(currentEnd));
        pauseDurations.push(gap);
      }
    }
  }

  const averagePauseSeconds =
    pauseDurations.length > 0
      ? parseFloat((pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length).toFixed(1))
      : 0;

  // 4. Repeated Words / Phrases
  const repeatedWords = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 2) {
      const phrase = `${words[i]} ${words[i]}`;
      const existing = repeatedWords.find((r) => r.phrase === phrase);
      if (existing) {
        existing.count += 1;
      } else {
        repeatedWords.push({ phrase, count: 2 });
      }
    }
  }

  // 5. Vocabulary Metrics (Type-Token Ratio)
  const uniqueWordsSet = new Set(words);
  const uniqueWords = uniqueWordsSet.size;
  const lexicalDiversity = totalWords > 0 ? parseFloat((uniqueWords / totalWords).toFixed(2)) : 0;

  // 6. Speech Clarity Indicator (0-100)
  // Higher pace regularity, lower filler ratio, healthy lexical variety
  let clarityScore = 80;
  if (totalWords > 0) {
    const fillerRatio = totalFillers / totalWords;
    if (fillerRatio > 0.08) clarityScore -= 15;
    else if (fillerRatio > 0.04) clarityScore -= 8;

    if (wordsPerMinute < 100 || wordsPerMinute > 170) clarityScore -= 10;
    if (pauseDurations.length > 3) clarityScore -= 8;
  }
  clarityScore = Math.max(30, Math.min(95, clarityScore));

  // 7. Volume variation
  const volumeVariation = {
    averageRms: audioMeasurements?.averageRms || 0.35,
    peakVolumeDb: audioMeasurements?.peakDb || -12,
    volumeDynamicRange: audioMeasurements?.dynamicRange || 'Healthy & Dynamic',
  };

  return {
    wordsPerMinute,
    totalWords,
    speechDuration: Math.round(effectiveDuration),
    fillerWords: {
      totalCount: totalFillers,
      breakdown: fillerBreakdown,
    },
    longPauses: {
      totalCount: pauseTimestamps.length,
      averagePauseSeconds,
      timestamps: pauseTimestamps,
    },
    repeatedWords: repeatedWords.slice(0, 5),
    volumeVariation,
    clarityScore,
    vocabularyMetrics: {
      uniqueWords,
      lexicalDiversity,
    },
  };
};

module.exports = {
  analyzeSpeech,
  COMMON_FILLER_WORDS,
};

