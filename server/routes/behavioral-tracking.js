
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all behavioral records
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT bt.*, c.first_name as cadet_first_name, c.last_name as cadet_last_name
    FROM behavioral_tracking bt
    LEFT JOIN cadets c ON bt.cadet_id = c.id
    ORDER BY bt.date DESC, bt.created_at DESC
  `, (err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(records);
  });
});

// Get behavioral records for specific cadet
router.get('/cadet/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT bt.*, c.first_name as cadet_first_name, c.last_name as cadet_last_name
    FROM behavioral_tracking bt
    LEFT JOIN cadets c ON bt.cadet_id = c.id
    WHERE bt.cadet_id = ?
    ORDER BY bt.date DESC, bt.created_at DESC
  `, [cadetId], (err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(records);
  });
});

// Create new behavioral record
router.post('/', authenticateToken, (req, res) => {
  const { cadet_id, behavior_type, severity, context, intervention, notes, date } = req.body;
  
  // Insert behavioral record
  db.run(`
    INSERT INTO behavioral_tracking (cadet_id, behavior_type, severity, context, intervention, notes, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [cadet_id, behavior_type, severity, context, intervention, notes, date],
  function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    // Update cadet's behavior score based on recent incidents
    updateCadetBehaviorScore(cadet_id);
    
    res.status(201).json({ 
      id: this.lastID, 
      message: 'Behavioral record created successfully' 
    });
  });
});

// Analytics endpoint for behavioral trends
router.get('/analytics/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT 
      behavior_type,
      AVG(severity) as avg_severity,
      COUNT(*) as frequency,
      date(date) as incident_date
    FROM behavioral_tracking 
    WHERE cadet_id = ? 
      AND date >= date('now', '-30 days')
    GROUP BY behavior_type, date(date)
    ORDER BY incident_date DESC
  `, [cadetId], (err, analytics) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate trends
    const trendData = calculateBehavioralTrends(analytics);
    
    res.json({
      analytics,
      trends: trendData,
      summary: {
        total_incidents: analytics.reduce((sum, a) => sum + a.frequency, 0),
        avg_severity: analytics.reduce((sum, a) => sum + a.avg_severity, 0) / analytics.length || 0,
        most_common_behavior: analytics.sort((a, b) => b.frequency - a.frequency)[0]?.behavior_type || 'None'
      }
    });
  });
});

// Psychology-based intervention suggestions
router.get('/interventions/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT bt.*, c.first_name, c.last_name, c.age, c.background_notes
    FROM behavioral_tracking bt
    LEFT JOIN cadets c ON bt.cadet_id = c.id
    WHERE bt.cadet_id = ?
    ORDER BY bt.date DESC
    LIMIT 10
  `, [cadetId], (err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const interventions = generatePsychologyBasedInterventions(records);
    res.json(interventions);
  });
});

function updateCadetBehaviorScore(cadetId) {
  // Calculate new behavior score based on recent incidents
  db.all(`
    SELECT severity, date 
    FROM behavioral_tracking 
    WHERE cadet_id = ? 
      AND date >= date('now', '-30 days')
    ORDER BY date DESC
    LIMIT 10
  `, [cadetId], (err, recentBehaviors) => {
    if (err || recentBehaviors.length === 0) return;
    
    // Weight recent behaviors more heavily
    let weightedScore = 0;
    let totalWeight = 0;
    
    recentBehaviors.forEach((behavior, index) => {
      const weight = Math.max(1, 10 - index); // More recent = higher weight
      weightedScore += behavior.severity * weight;
      totalWeight += weight;
    });
    
    const newScore = Math.round(weightedScore / totalWeight);
    
    // Update cadet's behavior score
    db.run(`
      UPDATE cadets 
      SET behavior_score = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [newScore, cadetId]);
  });
}

function calculateBehavioralTrends(analytics) {
  if (analytics.length < 2) return { trend: 'insufficient_data' };
  
  const recent = analytics.slice(0, Math.ceil(analytics.length / 2));
  const older = analytics.slice(Math.ceil(analytics.length / 2));
  
  const recentAvg = recent.reduce((sum, a) => sum + a.avg_severity, 0) / recent.length;
  const olderAvg = older.reduce((sum, a) => sum + a.avg_severity, 0) / older.length;
  
  const difference = recentAvg - olderAvg;
  
  return {
    trend: difference > 1 ? 'improving' : difference < -1 ? 'declining' : 'stable',
    change_magnitude: Math.abs(difference),
    recent_average: recentAvg,
    historical_average: olderAvg
  };
}

function generatePsychologyBasedInterventions(records) {
  if (records.length === 0) {
    return {
      interventions: ['Establish baseline behavioral observations'],
      rationale: 'No behavioral data available for analysis'
    };
  }
  
  const cadet = records[0];
  const avgSeverity = records.reduce((sum, r) => sum + r.severity, 0) / records.length;
  const commonBehaviors = {};
  
  records.forEach(record => {
    commonBehaviors[record.behavior_type] = (commonBehaviors[record.behavior_type] || 0) + 1;
  });
  
  const mostCommon = Object.keys(commonBehaviors).reduce((a, b) => 
    commonBehaviors[a] > commonBehaviors[b] ? a : b
  );
  
  const interventions = [];
  
  // Trauma-informed approaches for high-risk cadets
  if (avgSeverity <= 3) {
    interventions.push(
      'Implement trauma-informed care protocols',
      'Assign consistent primary staff member for attachment building',
      'Use de-escalation techniques and safe spaces',
      'Consider individual counseling referral',
      'Implement sensory regulation strategies'
    );
  }
  
  // Behavior-specific interventions
  switch (mostCommon) {
    case 'Aggression':
      interventions.push(
        'Teach anger management and coping skills',
        'Identify triggers and warning signs',
        'Implement physical activity as outlet',
        'Practice conflict resolution skills'
      );
      break;
    case 'Withdrawal':
      interventions.push(
        'Gradual social engagement activities',
        'Peer buddy system',
        'Interest-based group activities',
        'Build trust through one-on-one time'
      );
      break;
    case 'Defiance':
      interventions.push(
        'Clear, consistent boundaries with explanations',
        'Offer choices within structure',
        'Recognize positive behaviors immediately',
        'Address underlying needs (autonomy, competence)'
      );
      break;
    default:
      interventions.push(
        'Continue positive reinforcement strategies',
        'Monitor for environmental triggers',
        'Maintain consistent routines and expectations'
      );
  }
  
  // Age-appropriate considerations
  if (cadet.age < 16) {
    interventions.push('Use developmentally appropriate communication and expectations');
  }
  
  return {
    interventions,
    rationale: `Based on ${records.length} behavioral records with average severity ${avgSeverity.toFixed(1)}/10. Most common behavior: ${mostCommon}`,
    psychology_approach: avgSeverity <= 3 ? 'Trauma-informed care' : avgSeverity <= 6 ? 'Positive behavior support' : 'Strengths-based reinforcement',
    recommended_frequency: avgSeverity <= 3 ? 'Daily check-ins' : avgSeverity <= 6 ? 'Weekly reviews' : 'Bi-weekly monitoring'
  };
}

module.exports = router;
