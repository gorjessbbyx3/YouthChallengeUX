
const express = require('express');
const axios = require('axios');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// xAI Grok API Configuration
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_API_KEY = process.env.XAI_API_KEY;

// Enhanced AI Assistant for YCA CRM using xAI Grok
async function callGrokAI(messages, model = 'grok-beta') {
  try {
    if (!XAI_API_KEY) {
      throw new Error('xAI API key not configured');
    }

    const response = await axios.post(XAI_API_URL, {
      model: model,
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('xAI Grok API error:', error.response?.data || error.message);
    throw error;
  }
}

// Enhanced AI Assistant for YCA CRM
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = 'general', cadetId, staffId } = req.body;

    // Build context-aware prompt
    let systemPrompt = `You are Grok, an AI assistant for the Hawaii National Guard Youth Challenge Academy (YCA) CRM system. 
    You help staff manage at-risk youth (ages 16-18) with a focus on:
    - Behavior management and positive outcomes
    - HiSET completion (target: 78%)
    - Workforce placement (target: 48%)
    - Community service coordination
    - Mentorship and peer dynamics
    
    Be helpful, insightful, and maintain a professional yet approachable tone. Provide actionable advice based on child psychology principles and youth development best practices.`;

    let contextData = '';

    // Add specific context based on request type
    if (context === 'cadet' && cadetId) {
      const cadet = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM cadets WHERE id = ?', [cadetId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (cadet) {
        contextData = `\n\nCadet Context:
        - Name: ${cadet.first_name} ${cadet.last_name}
        - Behavior Score: ${cadet.behavior_score}/5
        - HiSET Status: ${cadet.hiset_status}
        - Placement Status: ${cadet.placement_status}
        - Risk Level: ${cadet.behavior_score <= 2 ? 'High' : cadet.behavior_score <= 3 ? 'Medium' : 'Low'}`;
      }
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt + contextData
      },
      {
        role: 'user',
        content: message
      }
    ];

    const response = await callGrokAI(messages);

    res.json({
      response,
      context,
      suggestions: generateSuggestions(context, message),
      timestamp: new Date().toISOString(),
      source: 'xai-grok'
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      error: 'AI service temporarily unavailable',
      fallback: generateFallbackResponse(req.body.message, req.body.context)
    });
  }
});

// Enhanced sentiment analysis with psychological insights using Grok
router.post('/analyze-sentiment', authenticateToken, async (req, res) => {
  try {
    const { text, cadetId, type = 'mentorship_note' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const messages = [
      {
        role: 'system',
        content: `You are a child psychology expert analyzing ${type} about a YCA cadet. Provide analysis in valid JSON format only, no additional text.`
      },
      {
        role: 'user',
        content: `Analyze this ${type} about a YCA cadet and respond with only JSON:

"${text}"

Required JSON format:
{
  "sentiment": "positive|negative|neutral|concerning",
  "urgency": "low|medium|high|critical",
  "psychologicalIndicators": ["indicator1", "indicator2"],
  "recommendations": ["action1", "action2"],
  "riskFactors": ["factor1", "factor2"],
  "strengths": ["strength1", "strength2"],
  "followUpNeeded": true,
  "confidenceScore": 0.85
}`
      }
    ];

    const response = await callGrokAI(messages);

    try {
      const analysis = JSON.parse(response);
      
      // Log the analysis
      if (cadetId) {
        db.run(`
          INSERT INTO sentiment_logs (cadet_id, text_analyzed, sentiment, urgency, analysis_date)
          VALUES (?, ?, ?, ?, ?)
        `, [cadetId, text, analysis.sentiment, analysis.urgency, new Date().toISOString()]);
      }

      res.json(analysis);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      res.json(fallbackSentimentAnalysis(text));
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.json(fallbackSentimentAnalysis(text));
  }
});

// AI-powered intervention recommendations using Grok
router.post('/intervention-recommendations', authenticateToken, async (req, res) => {
  try {
    const { cadetId, situation, urgency = 'medium' } = req.body;

    const cadet = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM cadets WHERE id = ?', [cadetId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a youth development specialist. Provide intervention recommendations in valid JSON format only.'
      },
      {
        role: 'user',
        content: `Recommend interventions for this YCA cadet and respond with only JSON:

Cadet Profile:
- Age: ${cadet.age}
- Behavior Score: ${cadet.behavior_score}/5
- Current Situation: ${situation}
- Urgency Level: ${urgency}
- Background: At-risk youth in military-style academy

Required JSON format:
{
  "immediateActions": ["action1", "action2"],
  "shortTermStrategies": ["strategy1", "strategy2"],
  "longTermGoals": ["goal1", "goal2"],
  "resourcesNeeded": ["resource1", "resource2"],
  "timeframe": "immediate|days|weeks",
  "successMetrics": ["metric1", "metric2"],
  "riskMitigation": ["risk1", "risk2"]
}`
      }
    ];

    const response = await callGrokAI(messages);

    try {
      const recommendations = JSON.parse(response);
      res.json(recommendations);
    } catch (parseError) {
      res.json(generateFallbackInterventions(cadet, situation, urgency));
    }
  } catch (error) {
    console.error('Intervention recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered schedule optimization using Grok
router.post('/optimize-schedule', authenticateToken, async (req, res) => {
  try {
    const { date, constraints = [] } = req.body;

    const staff = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM staff WHERE status = "active"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const cadets = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cadets WHERE status = "active"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const messages = [
      {
        role: 'system',
        content: 'You are a scheduling optimization expert for youth development programs.'
      },
      {
        role: 'user',
        content: `Optimize the daily schedule for YCA Kapolei:

Date: ${date}
Staff Available: ${staff.length} (${staff.map(s => s.first_name).join(', ')})
Cadets: ${cadets.length} total
High-Risk Cadets: ${cadets.filter(c => c.behavior_score <= 2).length}

Constraints: ${constraints.join(', ')}

Required Activities:
- Morning formation and inspection
- Academic classes (HiSET prep)
- Physical training
- Community service
- Mentorship sessions
- Life skills training

Provide an optimized schedule with time slots, assigned staff, and rationale for the scheduling decisions.`
      }
    ];

    const response = await callGrokAI(messages);

    res.json({
      schedule: response,
      optimization_notes: "AI-optimized using xAI Grok based on staff availability and cadet needs",
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Schedule optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced predictive analytics using Grok
router.get('/predict-outcomes/:cadetId', authenticateToken, async (req, res) => {
  try {
    const { cadetId } = req.params;

    const cadet = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM cadets WHERE id = ?', [cadetId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const mentorshipLogs = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM mentorship_logs WHERE cadet_id = ? ORDER BY date DESC LIMIT 10', [cadetId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const messages = [
      {
        role: 'system',
        content: 'You are a predictive analytics expert for youth development programs. Provide predictions in valid JSON format only.'
      },
      {
        role: 'user',
        content: `Predict success outcomes for this YCA cadet and respond with only JSON:

Cadet Profile:
- Behavior Score Trend: ${cadet.behavior_score}/5
- Days in Program: ${Math.floor((new Date() - new Date(cadet.enrollment_date)) / (1000 * 60 * 60 * 24))}
- HiSET Status: ${cadet.hiset_status}
- Recent Mentorship Notes: ${mentorshipLogs.length} entries

Required JSON format:
{
  "hisetCompletionProbability": 0.75,
  "workforcePlacementProbability": 0.65,
  "programCompletionProbability": 0.80,
  "riskFactors": ["factor1", "factor2"],
  "protectiveFactors": ["factor1", "factor2"],
  "recommendedInterventions": ["intervention1", "intervention2"],
  "confidenceLevel": "high|medium|low"
}`
      }
    ];

    const response = await callGrokAI(messages);

    try {
      const predictions = JSON.parse(response);
      res.json(predictions);
    } catch (parseError) {
      res.json(generateBasicPrediction(cadet, mentorshipLogs));
    }
  } catch (error) {
    console.error('Predictive analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback functions for when AI is unavailable
function generateSuggestions(context, message) {
  const suggestions = {
    general: ["Check cadet status", "Review daily schedule", "Generate reports"],
    cadet: ["View behavior history", "Schedule mentorship", "Check HiSET progress"],
    staff: ["View assignments", "Check schedule", "Review alerts"]
  };
  return suggestions[context] || suggestions.general;
}

function generateFallbackResponse(message, context) {
  const responses = {
    general: "I'm Grok, here to help with the YCA CRM system. Try asking about cadets, schedules, or reports.",
    cadet: "For cadet-related questions, I can help with behavior tracking, mentorship, and academic progress.",
    staff: "For staff management, I can assist with scheduling, assignments, and workload distribution."
  };
  return responses[context] || responses.general;
}

function fallbackSentimentAnalysis(text) {
  const negativeKeywords = ['frustrated', 'angry', 'upset', 'difficult', 'problem', 'fight', 'trouble', 'concerning'];
  const positiveKeywords = ['good', 'excellent', 'progress', 'improvement', 'success', 'motivated', 'positive'];
  
  const lowerText = text.toLowerCase();
  const hasNegative = negativeKeywords.some(keyword => lowerText.includes(keyword));
  const hasPositive = positiveKeywords.some(keyword => lowerText.includes(keyword));
  
  return {
    sentiment: hasNegative ? 'negative' : hasPositive ? 'positive' : 'neutral',
    urgency: hasNegative ? 'medium' : 'low',
    psychologicalIndicators: negativeKeywords.filter(keyword => lowerText.includes(keyword)),
    recommendations: hasNegative ? ['Schedule follow-up meeting', 'Consider additional support'] : ['Continue current approach'],
    followUpNeeded: hasNegative,
    confidenceScore: 0.6,
    note: 'Basic analysis (AI unavailable)'
  };
}

function generateFallbackInterventions(cadet, situation, urgency) {
  const interventions = {
    high: {
      immediateActions: ["Notify senior staff", "Increase supervision", "Schedule counseling"],
      shortTermStrategies: ["Behavior modification plan", "Peer mentor assignment", "Family contact"],
      timeframe: "immediate"
    },
    medium: {
      immediateActions: ["Document incident", "Schedule mentorship session"],
      shortTermStrategies: ["Monitor closely", "Adjust schedule if needed"],
      timeframe: "days"
    },
    low: {
      immediateActions: ["Continue monitoring", "Positive reinforcement"],
      shortTermStrategies: ["Peer leadership opportunities"],
      timeframe: "weeks"
    }
  };
  
  return interventions[urgency] || interventions.medium;
}

function generateBasicPrediction(cadet, mentorshipLogs) {
  const behaviorTrend = cadet.behavior_score >= 4 ? 'positive' : cadet.behavior_score <= 2 ? 'concerning' : 'stable';
  
  return {
    hisetCompletionProbability: behaviorTrend === 'positive' ? 0.8 : behaviorTrend === 'concerning' ? 0.4 : 0.6,
    workforcePlacementProbability: behaviorTrend === 'positive' ? 0.7 : behaviorTrend === 'concerning' ? 0.3 : 0.5,
    programCompletionProbability: behaviorTrend === 'positive' ? 0.9 : behaviorTrend === 'concerning' ? 0.5 : 0.7,
    riskFactors: behaviorTrend === 'concerning' ? ['Low behavior score', 'Need intervention'] : [],
    protectiveFactors: behaviorTrend === 'positive' ? ['Good behavior score', 'Stable progress'] : [],
    confidenceLevel: 'medium',
    note: 'Basic prediction (AI unavailable)'
  };
}

module.exports = router;
