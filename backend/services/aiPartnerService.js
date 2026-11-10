const axios = require('axios');

/**
 * AI Conversation Partner Service
 * Handles contextual interactive dialogue adapted to scenario and difficulty
 */

const getInitialPrompt = (scenario, category, difficulty, language = 'English') => {
  return `You are an expert communication partner on SpeakUp.
The user is practicing the scenario: "${scenario}" (${category}).
Difficulty level: ${difficulty}.
Language: ${language}.

Your role:
- If this is a Job Interview, HR Interview, or Technical Interview, act as an insightful, professional interviewer.
- If this is a Business Presentation or Team Meeting, act as an engaged senior colleague or stakeholder.
- If this is Casual Conversation or Storytelling, act as an empathetic, curious conversational partner.
- If this is a Debate or Expressing Opinions, act as a polite counter-party asking probing questions.

Guidelines:
1. Stay strictly in character.
2. Ask ONE focused, engaging question or respond briefly (2-3 sentences max) before asking your next question.
3. Match the difficulty level:
   - Beginner: Warm, welcoming, straightforward questions with clear hints.
   - Intermediate: Realistic professional tone, standard probing questions.
   - Advanced: Challenging scenarios, unexpected follow-ups, testing adaptability.
4. Do not break character. Do not output meta explanations.`;
};

const generateNextTurn = async ({ scenario, category, difficulty, language, conversationHistory = [] }) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const systemInstruction = getInitialPrompt(scenario, category, difficulty, language);

  // If Gemini key is available
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const contents = conversationHistory.map((item) => ({
        role: item.role === 'ai' ? 'model' : 'user',
        parts: [{ text: item.content }],
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        },
        { timeout: 20000 }
      );

      const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply.trim();
    } catch (err) {
      console.warn('Gemini chat error, fallback:', err.message);
    }
  }

  // If OpenAI key is available
  if (openaiKey && openaiKey.trim() !== '') {
    try {
      const messages = [
        { role: 'system', content: systemInstruction },
        ...conversationHistory.map((m) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.content,
        })),
      ];

      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const reply = res.data?.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
    } catch (err) {
      console.warn('OpenAI chat error, fallback:', err.message);
    }
  }

  // Deterministic contextual fallback partner
  return getFallbackPartnerResponse(scenario, difficulty, conversationHistory);
};

const getFallbackPartnerResponse = (scenario, difficulty, history) => {
  const userTurns = history.filter((h) => h.role === 'user').length;

  if (scenario.toLowerCase().includes('interview')) {
    const questions = [
      "Welcome! To start off, could you briefly introduce yourself and share what brings you to this role?",
      "That's insightful. Could you walk me through a complex problem you encountered recently and how you resolved it?",
      "How do you handle disagreement with a colleague or stakeholder when opinions clash on key decisions?",
      "Where do you see yourself making the most significant impact in the next 12 to 18 months?",
      "Thank you for sharing. What questions do you have for me or our team?",
    ];
    return questions[Math.min(userTurns, questions.length - 1)];
  }

  if (scenario.toLowerCase().includes('presentation') || scenario.toLowerCase().includes('meeting')) {
    const questions = [
      "Thanks for leading today's discussion. Could you outline the core objective we are aligning on today?",
      "That is a compelling point. How do you foresee this impacting our current team timeline and resource allocation?",
      "What are the main risks or bottlenecks you anticipate with this strategy, and how can we mitigate them?",
      "Great summary. What are the immediate next action items for each of us?",
    ];
    return questions[Math.min(userTurns, questions.length - 1)];
  }

  // Casual / Storytelling / Default
  const questions = [
    `Hi there! I'm glad we're practicing "${scenario}". What inspired you to choose this topic today?`,
    "That is really fascinating! Could you tell me more about what that experience taught you personally?",
    "If you had to convey one key lesson or feeling from that story to an audience, what would it be?",
    "That's wonderful perspective. How has that changed the way you approach new challenges today?",
  ];
  return questions[Math.min(userTurns, questions.length - 1)];
};

module.exports = {
  generateNextTurn,
};

