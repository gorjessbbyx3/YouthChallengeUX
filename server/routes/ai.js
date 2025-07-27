
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Sentiment analysis for mentor notes
router.post('/sentiment-analysis', authenticateToken, async (req, res) => {
  try {
    const { notes, mentorLogId } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analyze the sentiment of this mentor note about a cadet and return a score from -1 (very negative) to 1 (very positive), and determine if it should be flagged for urgent attention. Note: "${notes}"
    
    Return your response in this exact JSON format:
    {
      "sentimentScore": 0.2,
      "flagged": false,
      "reason": "explanation of the sentiment and flagging decision"
    }`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const analysis = JSON.parse(response);
      
      // Update the mentor log with sentiment analysis
      if (mentorLogId) {
        db.run(
          'UPDATE mentorship_logs SET sentiment_score = ?, flagged = ? WHERE id = ?',
          [analysis.sentimentScore, analysis.flagged ? 1 : 0, mentorLogId]
        );
      }
      
      res.json(analysis);
    } catch (parseError) {
      // Fallback simple sentiment analysis
      const negativePhrases = ['unmotivated', 'aggressive', 'disruptive', 'concerning', 'problem'];
      const hasNegative = negativePhrases.some(phrase => notes.toLowerCase().includes(phrase));
      
      res.json({
        sentimentScore: hasNegative ? -0.5 : 0.2,
        flagged: hasNegative,
        reason: 'Fallback analysis based on keyword detection'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate automated reports
router.post('/generate-report', authenticateToken, async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;
    
    // Get relevant data based on report type
    let data = {};
    
    if (reportType === 'monthly_summary') {
      // Get stats for the period
      db.all(`
        SELECT 
          COUNT(DISTINCT c.id) as total_cadets,
          COUNT(DISTINCT ml.id) as mentorship_sessions,
          AVG(c.behavior_score) as avg_behavior_score,
          SUM(e.community_service_hours) as total_service_hours,
          COUNT(CASE WHEN c.hiset_status = 'completed' THEN 1 END) as hiset_completions,
          COUNT(CASE WHEN c.placement_status IN ('workforce', 'education', 'military') THEN 1 END) as successful_placements
        FROM cadets c
        LEFT JOIN mentorship_logs ml ON c.id = ml.cadet_id AND ml.date BETWEEN ? AND ?
        LEFT JOIN events e ON e.start_date BETWEEN ? AND ?
      `, [startDate, endDate, startDate, endDate], async (err, stats) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Generate a professional monthly summary report for the Hawaii National Guard Youth Challenge Academy based on these statistics:
        
        - Total Cadets: ${stats[0].total_cadets}
        - Mentorship Sessions: ${stats[0].mentorship_sessions}
        - Average Behavior Score: ${stats[0].avg_behavior_score?.toFixed(2) || 'N/A'}
        - Community Service Hours: ${stats[0].total_service_hours || 0}
        - HiSET Completions: ${stats[0].hiset_completions}
        - Successful Placements: ${stats[0].successful_placements}
        
        Format this as a professional report suitable for DoD funders, highlighting program success and areas for improvement.`;
        
        const result = await model.generateContent(prompt);
        const report = result.response.text();
        
        res.json({ report, stats: stats[0] });
      });
    } else {
      res.status(400).json({ error: 'Unsupported report type' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory forecasting
router.get('/inventory-forecast', authenticateToken, (req, res) => {
  const { days = 30 } = req.query;
  
  db.all('SELECT * FROM inventory', (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const forecast = items.map(item => {
      const projectedUsage = item.usage_rate * parseInt(days);
      const projectedQuantity = item.quantity - projectedUsage;
      const needsRestock = projectedQuantity < item.threshold;
      
      return {
        ...item,
        projectedQuantity: Math.max(0, projectedQuantity),
        needsRestock,
        recommendedOrder: needsRestock ? Math.ceil(item.threshold * 2 - projectedQuantity) : 0
      };
    });
    
    res.json(forecast);
  });
});

module.exports = router;
