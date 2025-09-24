
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get cadet statistics
    const { data: cadets, error: cadetsError } = await supabase
      .from('cadets')
      .select('*')
      .eq('status', 'active');

    if (cadetsError) throw cadetsError;

    // Get recent behavioral incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from('behavioral_tracking')
      .select('*')
      .gte('incident_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (incidentsError) throw incidentsError;

    // Get academic performance
    const { data: academics, error: academicsError } = await supabase
      .from('academic_tracking')
      .select('*')
      .gte('assessment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (academicsError) throw academicsError;

    // Calculate metrics
    const analytics = {
      total_cadets: cadets?.length || 0,
      high_risk_cadets: cadets?.filter(c => c.behavior_score >= 4).length || 0,
      recent_incidents: incidents?.length || 0,
      average_grade: academics?.length > 0 ? 
        academics.reduce((sum, a) => sum + (a.grade || 0), 0) / academics.length : 0,
      hiset_completion_rate: cadets?.length > 0 ? 
        (cadets.filter(c => c.hiset_status === 'completed').length / cadets.length) * 100 : 0,
      trends: {
        behavioral_improvement: calculateBehavioralTrend(incidents || []),
        academic_progress: calculateAcademicTrend(academics || [])
      }
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateBehavioralTrend(incidents) {
  if (incidents.length === 0) return 'stable';
  
  const thisWeek = incidents.filter(i => 
    new Date(i.incident_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;
  
  const lastWeek = incidents.filter(i => {
    const date = new Date(i.incident_date);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return date <= weekAgo && date > twoWeeksAgo;
  }).length;
  
  if (thisWeek < lastWeek) return 'improving';
  if (thisWeek > lastWeek) return 'declining';
  return 'stable';
}

function calculateAcademicTrend(academics) {
  if (academics.length < 2) return 'stable';
  
  const sorted = academics.sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));
  const recent = sorted.slice(-5);
  const earlier = sorted.slice(-10, -5);
  
  if (recent.length === 0 || earlier.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, a) => sum + (a.grade || 0), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, a) => sum + (a.grade || 0), 0) / earlier.length;
  
  if (recentAvg > earlierAvg + 5) return 'improving';
  if (recentAvg < earlierAvg - 5) return 'declining';
  return 'stable';
}

module.exports = router;
