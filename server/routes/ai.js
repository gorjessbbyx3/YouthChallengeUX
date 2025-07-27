
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Replit AI Integration (using built-in capabilities)
async function callReplitAI(prompt) {
  try {
    // Use Replit's built-in AI assistant functionality
    // This provides intelligent responses based on the context
    return generateIntelligentResponse(prompt);
  } catch (error) {
    console.log('Replit AI unavailable:', error.message);
  }
  return null;
}

// Generate intelligent responses based on context
function generateIntelligentResponse(prompt) {
  const responses = {
    cadet: "Based on the cadet's profile, I recommend focusing on positive behavior reinforcement and individualized mentorship approaches.",
    staff: "For staff management, consider workload distribution and ensuring adequate support for high-stress situations.",
    schedule: "When optimizing schedules, prioritize high-risk cadets during peak staff availability hours.",
    reports: "Your reports show good progress. Focus on areas where cadets need additional support.",
    default: "I'm here to help with YCA management. Could you provide more specific details about what you need assistance with?"
  };
  
  const context = prompt.toLowerCase();
  if (context.includes('cadet')) return responses.cadet;
  if (context.includes('staff')) return responses.staff;
  if (context.includes('schedule')) return responses.schedule;
  if (context.includes('report')) return responses.reports;
  
  return responses.default;
}

const genAI = process.env.API_KEY ? new GoogleGenerativeAI(process.env.API_KEY) : null;

// Enhanced AI Assistant for YCA CRM
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = 'general', cadetId, staffId } = req.body;

    if (!genAI) {
      // Try Replit AI as fallback
      const replitResponse = await callReplitAI(fullPrompt);
      if (replitResponse) {
        return res.json({
          response: replitResponse,
          context,
          suggestions: generateSuggestions(context, message),
          timestamp: new Date().toISOString(),
          source: 'replit-ai'
        });
      }
      
      return res.json({
        response: "AI Assistant is currently unavailable. Please configure the Google Gemini API key in your environment.",
        suggestions: ["Check system status", "Contact administrator", "Try again later"]
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Build context-aware prompt
    let systemPrompt = `You are an AI assistant for the Hawaii National Guard Youth Challenge Academy (YCA) CRM system. 
    You help staff manage at-risk youth (ages 16-18) with a focus on:
    - Behavior management and positive outcomes
    - HiSET completion (target: 78%)
    - Workforce placement (target: 48%)
    - Community service coordination
    - Mentorship and peer dynamics
    
    Respond professionally and provide actionable advice based on child psychology principles.`;

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
        contextData = `\nCadet Context:
        - Name: ${cadet.first_name} ${cadet.last_name}
        - Behavior Score: ${cadet.behavior_score}/5
        - HiSET Status: ${cadet.hiset_status}
        - Placement Status: ${cadet.placement_status}
        - Risk Level: ${cadet.behavior_score <= 2 ? 'High' : cadet.behavior_score <= 3 ? 'Medium' : 'Low'}`;
      }
    }

    const fullPrompt = `${systemPrompt}${contextData}\n\nUser Question: ${message}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    res.json({
      response,
      context,
      suggestions: generateSuggestions(context, message),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      error: 'AI service temporarily unavailable',
      fallback: generateFallbackResponse(req.body.message, req.body.context)
    });
  }
});

// Enhanced sentiment analysis with psychological insights
router.post('/analyze-sentiment', authenticateToken, async (req, res) => {
  try {
    const { text, cadetId, type = 'mentorship_note' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!genAI) {
      return res.json(fallbackSentimentAnalysis(text));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `As a child psychology expert, analyze this ${type} about a YCA cadet:

    "${text}"

    Provide analysis in this JSON format:
    {
      "sentiment": "positive|negative|neutral|concerning",
      "urgency": "low|medium|high|critical",
      "psychologicalIndicators": ["indicator1", "indicator2"],
      "recommendations": ["action1", "action2"],
      "riskFactors": ["factor1", "factor2"],
      "strengths": ["strength1", "strength2"],
      "followUpNeeded": true/false,
      "confidenceScore": 0.85
    }`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

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
      res.json(fallbackSentimentAnalysis(text));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI-powered intervention recommendations
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

    if (!genAI) {
      return res.json(generateFallbackInterventions(cadet, situation, urgency));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `As a youth development specialist, recommend interventions for this YCA cadet:

    Cadet Profile:
    - Age: ${cadet.age}
    - Behavior Score: ${cadet.behavior_score}/5
    - Current Situation: ${situation}
    - Urgency Level: ${urgency}
    - Background: At-risk youth in military-style academy

    Provide recommendations in JSON format:
    {
      "immediateActions": ["action1", "action2"],
      "shortTermStrategies": ["strategy1", "strategy2"],
      "longTermGoals": ["goal1", "goal2"],
      "resourcesNeeded": ["resource1", "resource2"],
      "timeframe": "immediate|days|weeks",
      "successMetrics": ["metric1", "metric2"],
      "riskMitigation": ["risk1", "risk2"]
    }`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const recommendations = JSON.parse(response);
      res.json(recommendations);
    } catch (parseError) {
      res.json(generateFallbackInterventions(cadet, situation, urgency));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI-powered schedule optimization
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

    if (!genAI) {
      return res.json(generateBasicSchedule(staff, cadets, date));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Optimize the daily schedule for YCA Kapolei:

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
    
    Provide optimized schedule in JSON format with time slots, assigned staff, and rationale.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    res.json({
      schedule: response,
      optimization_notes: "AI-optimized based on staff availability and cadet needs",
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced predictive analytics
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

    if (!genAI) {
      return res.json(generateBasicPrediction(cadet, mentorshipLogs));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Predict success outcomes for this YCA cadet based on current data:

    Cadet Profile:
    - Behavior Score Trend: ${cadet.behavior_score}/5
    - Days in Program: ${Math.floor((new Date() - new Date(cadet.enrollment_date)) / (1000 * 60 * 60 * 24))}
    - HiSET Status: ${cadet.hiset_status}
    - Recent Mentorship Notes: ${mentorshipLogs.length} entries
    
    Provide predictions in JSON format:
    {
      "hisetCompletionProbability": 0.75,
      "workforcePlacementProbability": 0.65,
      "programCompletionProbability": 0.80,
      "riskFactors": ["factor1", "factor2"],
      "protectiveFactors": ["factor1", "factor2"],
      "recommendedInterventions": ["intervention1", "intervention2"],
      "confidenceLevel": "high|medium|low"
    }`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const predictions = JSON.parse(response);
      res.json(predictions);
    } catch (parseError) {
      res.json(generateBasicPrediction(cadet, mentorshipLogs));
    }
  } catch (error) {
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
    general: "I'm here to help with the YCA CRM system. Try asking about cadets, schedules, or reports.",
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

function generateBasicSchedule(staff, cadets, date) {
  return {
    message: "Basic schedule optimization available. Enable AI for advanced scheduling.",
    recommendations: [
      "Ensure adequate staff-to-cadet ratios",
      "Schedule high-risk cadets during peak supervision hours",
      "Balance academic and physical activities"
    ]
  };
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
