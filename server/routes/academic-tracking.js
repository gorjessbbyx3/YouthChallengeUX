
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all academic records
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT at.*, c.first_name as cadet_first_name, c.last_name as cadet_last_name
    FROM academic_tracking at
    LEFT JOIN cadets c ON at.cadet_id = c.id
    ORDER BY at.date DESC, at.created_at DESC
  `, (err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(records);
  });
});

// Get academic records for specific cadet
router.get('/cadet/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT at.*, c.first_name as cadet_first_name, c.last_name as cadet_last_name
    FROM academic_tracking at
    LEFT JOIN cadets c ON at.cadet_id = c.id
    WHERE at.cadet_id = ?
    ORDER BY at.date DESC, at.created_at DESC
  `, [cadetId], (err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(records);
  });
});

// Create new academic record
router.post('/', authenticateToken, (req, res) => {
  const { cadet_id, subject, assignment_type, score, max_score, date, notes } = req.body;
  
  // Insert academic record
  db.run(`
    INSERT INTO academic_tracking (cadet_id, subject, assignment_type, score, max_score, date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [cadet_id, subject, assignment_type, score, max_score, date, notes],
  function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    // Update cadet's academic score based on recent performance
    updateCadetAcademicScore(cadet_id);
    
    res.status(201).json({ 
      id: this.lastID, 
      message: 'Academic record created successfully' 
    });
  });
});

// Get academic analytics for a cadet
router.get('/analytics/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT 
      subject,
      assignment_type,
      AVG(CAST(score AS FLOAT) / CAST(max_score AS FLOAT) * 100) as avg_percentage,
      COUNT(*) as total_assignments,
      date(date) as assignment_date
    FROM academic_tracking 
    WHERE cadet_id = ? 
      AND date >= date('now', '-90 days')
    GROUP BY subject, assignment_type
    ORDER BY assignment_date DESC
  `, [cadetId], (err, analytics) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const trendData = calculateAcademicTrends(cadetId);
    
    res.json({
      analytics,
      trends: trendData,
      summary: {
        total_assignments: analytics.reduce((sum, a) => sum + a.total_assignments, 0),
        overall_average: analytics.reduce((sum, a) => sum + a.avg_percentage, 0) / analytics.length || 0,
        strongest_subject: analytics.sort((a, b) => b.avg_percentage - a.avg_percentage)[0]?.subject || 'None',
        needs_improvement: analytics.filter(a => a.avg_percentage < 70).map(a => a.subject)
      }
    });
  });
});

// Get learning recommendations based on performance
router.get('/recommendations/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT at.*, c.first_name, c.last_name, c.age, c.learning_style
    FROM academic_tracking at
    LEFT JOIN cadets c ON at.cadet_id = c.id
    WHERE at.cadet_id = ?
    ORDER BY at.date DESC
    LIMIT 20
  `, [cadetId], (err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const recommendations = generateLearningRecommendations(records);
    res.json(recommendations);
  });
});

// HiSET readiness assessment
router.get('/hiset-readiness/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT subject, AVG(CAST(score AS FLOAT) / CAST(max_score AS FLOAT) * 100) as avg_percentage
    FROM academic_tracking 
    WHERE cadet_id = ? 
      AND (subject LIKE '%HiSET%' OR assignment_type = 'HiSET Practice Test')
      AND date >= date('now', '-60 days')
    GROUP BY subject
  `, [cadetId], (err, hisetData) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const readinessAssessment = assessHiSETReadiness(hisetData);
    res.json(readinessAssessment);
  });
});

function updateCadetAcademicScore(cadetId) {
  // Calculate new academic score based on recent performance
  db.all(`
    SELECT CAST(score AS FLOAT) / CAST(max_score AS FLOAT) * 100 as percentage, date 
    FROM academic_tracking 
    WHERE cadet_id = ? 
      AND date >= date('now', '-30 days')
    ORDER BY date DESC
    LIMIT 10
  `, [cadetId], (err, recentGrades) => {
    if (err || recentGrades.length === 0) return;
    
    // Weight recent grades more heavily
    let weightedScore = 0;
    let totalWeight = 0;
    
    recentGrades.forEach((grade, index) => {
      const weight = Math.max(1, 10 - index); // More recent = higher weight
      weightedScore += grade.percentage * weight;
      totalWeight += weight;
    });
    
    const newScore = Math.round(weightedScore / totalWeight);
    
    // Update cadet's academic score
    db.run(`
      UPDATE cadets 
      SET academic_score = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [newScore, cadetId]);
  });
}

function calculateAcademicTrends(cadetId) {
  return new Promise((resolve) => {
    db.all(`
      SELECT CAST(score AS FLOAT) / CAST(max_score AS FLOAT) * 100 as percentage, date
      FROM academic_tracking 
      WHERE cadet_id = ? 
        AND date >= date('now', '-60 days')
      ORDER BY date ASC
    `, [cadetId], (err, grades) => {
      if (err || grades.length < 3) {
        resolve({ trend: 'insufficient_data' });
        return;
      }
      
      const firstHalf = grades.slice(0, Math.ceil(grades.length / 2));
      const secondHalf = grades.slice(Math.ceil(grades.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, g) => sum + g.percentage, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, g) => sum + g.percentage, 0) / secondHalf.length;
      
      const difference = secondAvg - firstAvg;
      
      resolve({
        trend: difference > 10 ? 'improving' : difference < -10 ? 'declining' : 'stable',
        change_magnitude: Math.abs(difference),
        early_average: firstAvg,
        recent_average: secondAvg
      });
    });
  });
}

function generateLearningRecommendations(records) {
  if (records.length === 0) {
    return {
      recommendations: ['Establish baseline academic assessment'],
      rationale: 'No academic data available for analysis'
    };
  }
  
  const cadet = records[0];
  const subjectPerformance = {};
  
  records.forEach(record => {
    const percentage = (record.score / record.max_score) * 100;
    if (!subjectPerformance[record.subject]) {
      subjectPerformance[record.subject] = [];
    }
    subjectPerformance[record.subject].push(percentage);
  });
  
  const recommendations = [];
  const strengths = [];
  const challenges = [];
  
  Object.keys(subjectPerformance).forEach(subject => {
    const avg = subjectPerformance[subject].reduce((sum, score) => sum + score, 0) / subjectPerformance[subject].length;
    
    if (avg >= 80) {
      strengths.push(subject);
    } else if (avg < 60) {
      challenges.push(subject);
    }
  });
  
  // Strengths-based recommendations
  if (strengths.length > 0) {
    recommendations.push(`Leverage strengths in ${strengths.join(', ')} for peer tutoring opportunities`);
    recommendations.push('Consider advanced coursework or leadership roles in strong subjects');
  }
  
  // Challenge-based recommendations
  challenges.forEach(subject => {
    const avg = subjectPerformance[subject].reduce((sum, score) => sum + score, 0) / subjectPerformance[subject].length;
    
    if (avg < 50) {
      recommendations.push(`${subject}: Implement intensive intervention with 1:1 tutoring`);
      recommendations.push(`${subject}: Break down concepts into smaller, manageable chunks`);
    } else {
      recommendations.push(`${subject}: Provide additional practice and review sessions`);
    }
  });
  
  // Learning style considerations
  if (cadet.learning_style) {
    switch (cadet.learning_style.toLowerCase()) {
      case 'visual':
        recommendations.push('Use visual aids, charts, and diagrams in instruction');
        break;
      case 'auditory':
        recommendations.push('Incorporate verbal explanations and group discussions');
        break;
      case 'kinesthetic':
        recommendations.push('Include hands-on activities and movement in learning');
        break;
    }
  }
  
  // Age-appropriate strategies
  if (cadet.age < 16) {
    recommendations.push('Use shorter study sessions with frequent breaks');
    recommendations.push('Incorporate gamification elements to maintain engagement');
  }
  
  return {
    recommendations,
    strengths,
    challenges,
    overall_performance: records.reduce((sum, r) => sum + (r.score / r.max_score * 100), 0) / records.length,
    rationale: `Based on ${records.length} academic records across ${Object.keys(subjectPerformance).length} subjects`
  };
}

function assessHiSETReadiness(hisetData) {
  if (hisetData.length === 0) {
    return {
      ready: false,
      overall_score: 0,
      recommendations: ['Complete HiSET practice tests to establish baseline'],
      subjects_ready: [],
      subjects_need_work: ['All subjects need assessment']
    };
  }
  
  const passingScore = 65; // Typical HiSET passing score
  const readySubjects = hisetData.filter(s => s.avg_percentage >= passingScore);
  const needWorkSubjects = hisetData.filter(s => s.avg_percentage < passingScore);
  
  const overallScore = hisetData.reduce((sum, s) => sum + s.avg_percentage, 0) / hisetData.length;
  const ready = readySubjects.length >= 4 && overallScore >= passingScore; // Need to pass 4/5 subjects
  
  const recommendations = [];
  
  if (ready) {
    recommendations.push('Cadet appears ready for HiSET examination');
    recommendations.push('Schedule official HiSET test registration');
    recommendations.push('Continue review sessions to maintain readiness');
  } else {
    recommendations.push(`Focus intensive study on: ${needWorkSubjects.map(s => s.subject).join(', ')}`);
    recommendations.push('Increase HiSET practice test frequency');
    
    if (overallScore < 50) {
      recommendations.push('Consider extended preparation timeline (3-6 months)');
    } else {
      recommendations.push('Target test date in 1-2 months with focused preparation');
    }
  }
  
  return {
    ready,
    overall_score: overallScore,
    recommendations,
    subjects_ready: readySubjects.map(s => s.subject),
    subjects_need_work: needWorkSubjects.map(s => s.subject),
    estimated_timeline: ready ? '0-1 months' : overallScore >= 50 ? '1-2 months' : '3-6 months'
  };
}

module.exports = router;
