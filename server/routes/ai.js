const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Mock AI responses for demonstration (replace with actual AI service)
const generateMockInsights = (cadets, behavioralData, academicData) => {
  const insights = [];

  // Analyze behavioral patterns
  if (behavioralData.length > 0) {
    const recentIncidents = behavioralData.filter(b => 
      new Date(b.incident_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentIncidents.length > 5) {
      insights.push({
        type: 'warning',
        title: 'Increased Behavioral Incidents',
        description: `${recentIncidents.length} behavioral incidents recorded in the past week. Consider implementing additional support measures.`,
        priority: 'high',
        confidence: 87
      });
    }
  }

  // Analyze academic performance
  if (academicData.length > 0) {
    const strugglingCadets = academicData.filter(a => a.grade < 70).length;
    if (strugglingCadets > cadets.length * 0.3) {
      insights.push({
        type: 'recommendation',
        title: 'Academic Support Needed',
        description: `${strugglingCadets} cadets are struggling academically. Consider additional tutoring or modified curriculum.`,
        priority: 'medium',
        confidence: 92
      });
    }
  }

  // Positive trend analysis
  const activeCadets = cadets.filter(c => c.status === 'active').length;
  if (activeCadets > 0) {
    insights.push({
      type: 'trend',
      title: 'Strong Program Engagement',
      description: `${activeCadets} cadets actively participating. Engagement levels are above target.`,
      priority: 'low',
      confidence: 95
    });
  }

  return insights;
};

const generateMockRecommendations = () => {
  return [
    {
      category: 'Schedule Optimization',
      recommendation: 'Consider moving physical training to earlier hours for better cadet energy levels.',
      impact: 'High',
      confidence: 89
    },
    {
      category: 'Resource Allocation',
      recommendation: 'Increase counseling staff during peak stress periods (exam weeks).',
      impact: 'Medium',
      confidence: 76
    },
    {
      category: 'Communication Enhancement',
      recommendation: 'Implement weekly parent updates to improve family engagement.',
      impact: 'High',
      confidence: 93
    },
    {
      category: 'Academic Support',
      recommendation: 'Create peer tutoring programs for struggling subjects.',
      impact: 'Medium',
      confidence: 81
    }
  ];
};

// Get AI insights
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    // Fetch data for analysis
    const { data: cadets } = await supabase
      .from('cadets')
      .select('*')
      .eq('status', 'active');

    const { data: behavioralData } = await supabase
      .from('behavioral_tracking')
      .select('*')
      .gte('incident_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: academicData } = await supabase
      .from('academic_tracking')
      .select('*')
      .gte('assessment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Generate insights (in production, this would call an actual AI service)
    const insights = generateMockInsights(cadets || [], behavioralData || [], academicData || []);
    const recommendations = generateMockRecommendations();

    res.json({
      insights,
      recommendations,
      metadata: {
        generated_at: new Date().toISOString(),
        data_points: (cadets?.length || 0) + (behavioralData?.length || 0) + (academicData?.length || 0),
        confidence_average: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length || 0
      }
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      insights: [],
      recommendations: []
    });
  }
});

// Analyze specific cadet
router.post('/analyze-cadet', authenticateToken, async (req, res) => {
  try {
    const { cadetId } = req.body;

    // Fetch cadet data
    const { data: cadet } = await supabase
      .from('cadets')
      .select('*')
      .eq('id', cadetId)
      .single();

    if (!cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }

    // Fetch related data
    const { data: behavioralRecords } = await supabase
      .from('behavioral_tracking')
      .select('*')
      .eq('cadet_id', cadetId)
      .order('incident_date', { ascending: false })
      .limit(10);

    const { data: academicRecords } = await supabase
      .from('academic_tracking')
      .select('*')
      .eq('cadet_id', cadetId)
      .order('assessment_date', { ascending: false })
      .limit(10);

    // Generate analysis
    const analysis = {
      academic: 'Performing well with consistent improvement in core subjects',
      behavioral: 'Demonstrates positive leadership qualities and good peer relationships',
      recommendations: 'Consider advanced coursework opportunities and leadership roles',
      risk_level: 'Low',
      engagement_score: 85,
      areas_of_strength: ['Leadership', 'Academic Performance', 'Peer Relations'],
      areas_for_improvement: ['Time Management', 'Physical Fitness Goals']
    };

    // Adjust analysis based on actual data
    if (behavioralRecords && behavioralRecords.length > 3) {
      analysis.behavioral = 'Recent behavioral incidents require attention and intervention';
      analysis.risk_level = 'Medium';
      analysis.recommendations = 'Implement targeted behavioral support plan';
    }

    if (academicRecords) {
      const recentGrades = academicRecords.slice(0, 5);
      const avgGrade = recentGrades.reduce((sum, r) => sum + (r.grade || 75), 0) / recentGrades.length;

      if (avgGrade < 70) {
        analysis.academic = 'Academic performance below expectations, requires additional support';
        analysis.risk_level = analysis.risk_level === 'Medium' ? 'High' : 'Medium';
      }
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing cadet:', error);
    res.status(500).json({ error: 'Failed to analyze cadet' });
  }
});

// AI Chat endpoint
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;

    // Mock AI chat responses (replace with actual AI service like Google Gemini)
    const responses = {
      greeting: "Hello! I'm here to help with your YCA program management. What would you like to know?",
      cadet_performance: "Based on recent data, most cadets are performing well academically. I recommend focusing on the 15% who need additional support.",
      scheduling: "For optimal scheduling, consider cadet energy levels, staff availability, and facility usage patterns.",
      behavioral: "Positive reinforcement and clear expectations are key to maintaining good behavior standards.",
      default: "I understand you're asking about the YCA program. Could you be more specific about what you'd like to know?"
    };

    let response = responses.default;

    // Simple keyword matching (replace with sophisticated NLP)
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = responses.greeting;
    } else if (lowerMessage.includes('performance') || lowerMessage.includes('grade')) {
      response = responses.cadet_performance;
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('time')) {
      response = responses.scheduling;
    } else if (lowerMessage.includes('behavior') || lowerMessage.includes('discipline')) {
      response = responses.behavioral;
    }

    res.json({ response });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ 
      error: 'Chat service temporarily unavailable',
      response: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.'
    });
  }
});

// Get AI-powered staff recommendations
router.get('/staff-recommendations', authenticateToken, async (req, res) => {
  try {
    const { data: staff } = await supabase
      .from('staff')
      .select('*')
      .eq('is_active', true);

    const { data: schedules } = await supabase
      .from('staff_schedules')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0]);

    const recommendations = [
      {
        type: 'workload_balance',
        message: 'Staff workload appears balanced across departments',
        priority: 'low'
      },
      {
        type: 'coverage_optimization',
        message: 'Consider cross-training staff for better schedule flexibility',
        priority: 'medium'
      }
    ];

    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating staff recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Predictive analytics for cadet outcomes
router.get('/predictive-analytics', authenticateToken, async (req, res) => {
  try {
    const { data: cadets } = await supabase
      .from('cadets')
      .select('*');

    // Mock predictive analytics
    const analytics = {
      graduation_rate_prediction: 89.5,
      at_risk_cadets: Math.floor(cadets?.length * 0.12) || 0,
      success_factors: [
        'Regular attendance',
        'Family engagement',
        'Peer relationships',
        'Academic performance'
      ],
      recommendations: [
        'Increase family communication',
        'Implement peer mentorship',
        'Provide academic support'
      ]
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error generating predictive analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

module.exports = router;