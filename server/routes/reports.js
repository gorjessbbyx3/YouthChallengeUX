
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get behavioral analysis report
router.get('/behavioral', authenticateToken, (req, res) => {
  // Get behavior score distribution
  db.all(`
    SELECT behavior_score, COUNT(*) as count 
    FROM cadets 
    GROUP BY behavior_score 
    ORDER BY behavior_score
  `, (err, behaviorDist) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get high-risk cadets
    db.all(`
      SELECT name, behavior_score, risk_level 
      FROM cadets 
      WHERE behavior_score <= 2 
      ORDER BY behavior_score ASC
    `, (err, highRiskCadets) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const behaviorDistribution = [1,2,3,4,5].map(score => {
        const found = behaviorDist.find(item => item.behavior_score === score);
        return found ? found.count : 0;
      });

      res.json({
        behaviorDistribution,
        highRiskCadets,
        highRiskCount: highRiskCadets.length,
        totalCadets: behaviorDistribution.reduce((a, b) => a + b, 0)
      });
    });
  });
});

// Get academic progress report
router.get('/academic', authenticateToken, (req, res) => {
  db.all(`
    SELECT hiset_status, COUNT(*) as count 
    FROM cadets 
    GROUP BY hiset_status
  `, (err, hisetDist) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.get(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN hiset_status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM cadets
    `, (err, totals) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const hisetDistribution = ['not_started', 'in_progress', 'completed'].map(status => {
        const found = hisetDist.find(item => item.hiset_status === status);
        return found ? found.count : 0;
      });

      const completionRate = totals.total > 0 ? 
        ((totals.completed / totals.total) * 100).toFixed(1) : 0;

      res.json({
        hisetDistribution,
        completionRate,
        avgCompletionTime: 180, // This could be calculated from actual data
        totalCadets: totals.total
      });
    });
  });
});

// Get placement outcomes report
router.get('/placement', authenticateToken, (req, res) => {
  db.all(`
    SELECT placement_status, COUNT(*) as count 
    FROM cadets 
    GROUP BY placement_status
  `, (err, placementDist) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.get(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN placement_status IN ('workforce', 'education', 'military') THEN 1 ELSE 0 END) as successful
      FROM cadets
    `, (err, totals) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const placementDistribution = ['workforce', 'education', 'military', 'seeking'].map(status => {
        const found = placementDist.find(item => item.placement_status === status);
        return found ? found.count : 0;
      });

      const successRate = totals.total > 0 ? 
        ((totals.successful / totals.total) * 100).toFixed(1) : 0;

      const topSectors = placementDist
        .filter(item => ['workforce', 'education', 'military'].includes(item.placement_status))
        .map(item => ({ name: item.placement_status, count: item.count }))
        .sort((a, b) => b.count - a.count);

      res.json({
        placementDistribution,
        successRate,
        topSectors,
        totalCadets: totals.total
      });
    });
  });
});

// Get system alerts
router.get('/alerts', authenticateToken, (req, res) => {
  const alerts = [];

  // Check for high-risk cadets
  db.get('SELECT COUNT(*) as count FROM cadets WHERE behavior_score <= 2', (err, highRisk) => {
    if (highRisk && highRisk.count > 0) {
      alerts.push({
        severity: 'error',
        message: `${highRisk.count} cadets require immediate behavioral intervention`
      });
    }

    // Check for low stock items
    db.get('SELECT COUNT(*) as count FROM inventory WHERE quantity <= threshold', (err, lowStock) => {
      if (lowStock && lowStock.count > 0) {
        alerts.push({
          severity: 'warning',
          message: `${lowStock.count} inventory items need restocking`
        });
      }

      // Check for overdue mentorship sessions
      db.get(`
        SELECT COUNT(DISTINCT cadet_id) as count 
        FROM cadets c 
        WHERE NOT EXISTS (
          SELECT 1 FROM mentorship_logs ml 
          WHERE ml.cadet_id = c.id 
          AND ml.date >= date('now', '-30 days')
        )
      `, (err, overdue) => {
        if (overdue && overdue.count > 0) {
          alerts.push({
            severity: 'info',
            message: `${overdue.count} cadets haven't had mentorship sessions in 30+ days`
          });
        }

        res.json(alerts);
      });
    });
  });
});

// Export report data
router.get('/:reportType/export', authenticateToken, (req, res) => {
  const { reportType } = req.params;
  const { format = 'csv' } = req.query;
  
  // This is a simplified export - in production you'd want proper CSV/PDF generation
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);
  
  // Basic CSV structure - enhance based on report type
  let csvContent = 'Report Type,Generated Date,Data\n';
  csvContent += `${reportType},${new Date().toISOString()},Export functionality placeholder\n`;
  
  res.send(csvContent);
});

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, (req, res) => {
  const stats = {};
  
  // Get total cadets
  db.get('SELECT COUNT(*) as count FROM cadets WHERE status = "active"', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalCadets = result.count;
    
    // Get HiSET completion rate
    db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN hiset_status = 'completed' THEN 1 END) as completed
      FROM cadets WHERE status = 'active' OR status = 'graduated'
    `, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.hisetCompletionRate = result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;
      
      // Get placement rate
      db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN placement_status IN ('workforce', 'education', 'military') THEN 1 END) as placed
        FROM cadets WHERE status = 'graduated'
      `, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.placementRate = result.total > 0 ? Math.round((result.placed / result.total) * 100) : 0;
        
        // Get high-risk cadets
        db.get('SELECT COUNT(*) as count FROM cadets WHERE behavior_score <= 2 AND status = "active"', (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.highRiskCadets = result.count;
          
          // Get low stock items
          db.get('SELECT COUNT(*) as count FROM inventory WHERE quantity <= threshold', (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.lowStockItems = result.count;
            
            // Get inventory forecast
            db.all('SELECT * FROM inventory WHERE quantity <= threshold', (err, items) => {
              if (err) return res.status(500).json({ error: err.message });
              stats.inventory = items.map(item => ({
                ...item,
                needsRestock: item.quantity <= item.threshold,
                projectedQuantity: Math.max(0, item.quantity - (item.usage_rate * 30))
              }));
              
              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// Get behavior score distribution
router.get('/behavior-distribution', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      behavior_score,
      COUNT(*) as count
    FROM cadets 
    WHERE status = 'active'
    GROUP BY behavior_score
    ORDER BY behavior_score
  `, (err, distribution) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(distribution);
  });
});

// Get placement distribution
router.get('/placement-distribution', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      placement_status,
      COUNT(*) as count
    FROM cadets 
    WHERE status = 'graduated' AND placement_status IS NOT NULL
    GROUP BY placement_status
  `, (err, distribution) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(distribution);
  });
});

module.exports = router;
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get cadet performance report
router.get('/cadet-performance', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, platoon } = req.query;

    let query = supabase
      .from('cadets')
      .select(`
        id, first_name, last_name, platoon, status,
        academic_tracking (
          subject, grade, assessment_date
        ),
        behavioral_tracking (
          incident_type, severity, incident_date
        )
      `);

    if (platoon) {
      query = query.eq('platoon', platoon);
    }

    const { data: cadets, error } = await query;

    if (error) throw error;

    // Process performance data
    const performance = cadets.map(cadet => {
      const academicData = cadet.academic_tracking || [];
      const behavioralData = cadet.behavioral_tracking || [];

      // Filter by date range if provided
      const filteredAcademic = start_date && end_date 
        ? academicData.filter(a => a.assessment_date >= start_date && a.assessment_date <= end_date)
        : academicData;

      const filteredBehavioral = start_date && end_date
        ? behavioralData.filter(b => b.incident_date >= start_date && b.incident_date <= end_date)
        : behavioralData;

      const avgGrade = filteredAcademic.length > 0
        ? filteredAcademic.reduce((sum, a) => sum + (a.grade || 0), 0) / filteredAcademic.length
        : 0;

      const behavioralIncidents = filteredBehavioral.length;
      const highSeverityIncidents = filteredBehavioral.filter(b => b.severity === 'high').length;

      return {
        ...cadet,
        performance_metrics: {
          average_grade: Math.round(avgGrade * 100) / 100,
          total_assessments: filteredAcademic.length,
          behavioral_incidents: behavioralIncidents,
          high_severity_incidents: highSeverityIncidents,
          performance_score: calculatePerformanceScore(avgGrade, behavioralIncidents)
        }
      };
    });

    res.json({
      report_type: 'cadet_performance',
      generated_at: new Date().toISOString(),
      date_range: { start_date, end_date },
      filters: { platoon },
      data: performance,
      summary: generatePerformanceSummary(performance)
    });
  } catch (error) {
    console.error('Error generating cadet performance report:', error);
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

// Get staff workload report
router.get('/staff-workload', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const { data: staff, error } = await supabase
      .from('staff')
      .select(`
        id, first_name, last_name, role, department,
        staff_schedules (
          task_name, date, start_time, end_time
        )
      `)
      .eq('is_active', true);

    if (error) throw error;

    const workloadData = staff.map(member => {
      const schedules = member.staff_schedules || [];
      
      // Filter by date range if provided
      const filteredSchedules = start_date && end_date
        ? schedules.filter(s => s.date >= start_date && s.date <= end_date)
        : schedules;

      const totalHours = filteredSchedules.reduce((total, schedule) => {
        const start = new Date(`1970-01-01T${schedule.start_time}`);
        const end = new Date(`1970-01-01T${schedule.end_time}`);
        const hours = (end - start) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      return {
        ...member,
        workload_metrics: {
          total_hours: Math.round(totalHours * 100) / 100,
          total_assignments: filteredSchedules.length,
          average_hours_per_day: filteredSchedules.length > 0 
            ? Math.round((totalHours / filteredSchedules.length) * 100) / 100 
            : 0,
          workload_level: getWorkloadLevel(totalHours, filteredSchedules.length)
        }
      };
    });

    res.json({
      report_type: 'staff_workload',
      generated_at: new Date().toISOString(),
      date_range: { start_date, end_date },
      data: workloadData,
      summary: generateWorkloadSummary(workloadData)
    });
  } catch (error) {
    console.error('Error generating staff workload report:', error);
    res.status(500).json({ error: 'Failed to generate workload report' });
  }
});

// Get program effectiveness report
router.get('/program-effectiveness', authenticateToken, async (req, res) => {
  try {
    const { data: cadets } = await supabase
      .from('cadets')
      .select(`
        id, status, enrollment_date, graduation_date,
        academic_tracking (grade, assessment_date),
        behavioral_tracking (incident_type, severity, incident_date),
        mentorship_relationships (status, start_date, end_date)
      `);

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'completed');

    // Calculate program metrics
    const totalCadets = cadets.length;
    const activeCadets = cadets.filter(c => c.status === 'active').length;
    const graduatedCadets = cadets.filter(c => c.status === 'graduated').length;
    const graduationRate = totalCadets > 0 ? (graduatedCadets / totalCadets) * 100 : 0;

    // Academic performance trends
    const allGrades = cadets.flatMap(c => c.academic_tracking || []);
    const avgGrade = allGrades.length > 0
      ? allGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / allGrades.length
      : 0;

    // Behavioral trends
    const allIncidents = cadets.flatMap(c => c.behavioral_tracking || []);
    const incidentRate = totalCadets > 0 ? allIncidents.length / totalCadets : 0;

    // Mentorship effectiveness
    const mentorships = cadets.flatMap(c => c.mentorship_relationships || []);
    const activeMentorships = mentorships.filter(m => m.status === 'active').length;
    const completedMentorships = mentorships.filter(m => m.status === 'completed').length;

    const effectiveness = {
      enrollment_metrics: {
        total_cadets: totalCadets,
        active_cadets: activeCadets,
        graduated_cadets: graduatedCadets,
        graduation_rate: Math.round(graduationRate * 100) / 100
      },
      academic_metrics: {
        average_grade: Math.round(avgGrade * 100) / 100,
        total_assessments: allGrades.length,
        passing_rate: allGrades.length > 0 
          ? Math.round((allGrades.filter(g => g.grade >= 70).length / allGrades.length) * 100) 
          : 0
      },
      behavioral_metrics: {
        incident_rate: Math.round(incidentRate * 100) / 100,
        total_incidents: allIncidents.length,
        high_severity_incidents: allIncidents.filter(i => i.severity === 'high').length
      },
      mentorship_metrics: {
        active_mentorships: activeMentorships,
        completed_mentorships: completedMentorships,
        mentorship_completion_rate: mentorships.length > 0 
          ? Math.round((completedMentorships / mentorships.length) * 100) 
          : 0
      },
      program_activities: {
        total_events: events.length,
        average_participants: events.length > 0
          ? Math.round(events.reduce((sum, e) => sum + (e.participant_ids?.length || 0), 0) / events.length)
          : 0
      }
    };

    res.json({
      report_type: 'program_effectiveness',
      generated_at: new Date().toISOString(),
      data: effectiveness,
      recommendations: generateEffectivenessRecommendations(effectiveness)
    });
  } catch (error) {
    console.error('Error generating program effectiveness report:', error);
    res.status(500).json({ error: 'Failed to generate effectiveness report' });
  }
});

// Get financial summary report
router.get('/financial-summary', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let eventQuery = supabase
      .from('events')
      .select('budget, start_date');

    let inventoryQuery = supabase
      .from('inventory')
      .select('cost, purchase_date');

    if (start_date && end_date) {
      eventQuery = eventQuery
        .gte('start_date', start_date)
        .lte('start_date', end_date);
      
      inventoryQuery = inventoryQuery
        .gte('purchase_date', start_date)
        .lte('purchase_date', end_date);
    }

    const [{ data: events }, { data: inventory }] = await Promise.all([
      eventQuery,
      inventoryQuery
    ]);

    const eventCosts = events?.reduce((sum, e) => sum + (parseFloat(e.budget) || 0), 0) || 0;
    const inventoryCosts = inventory?.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0) || 0;
    const totalCosts = eventCosts + inventoryCosts;

    const financial = {
      event_expenses: Math.round(eventCosts * 100) / 100,
      inventory_expenses: Math.round(inventoryCosts * 100) / 100,
      total_expenses: Math.round(totalCosts * 100) / 100,
      expense_breakdown: {
        events: events?.length || 0,
        inventory_items: inventory?.length || 0
      }
    };

    res.json({
      report_type: 'financial_summary',
      generated_at: new Date().toISOString(),
      date_range: { start_date, end_date },
      data: financial
    });
  } catch (error) {
    console.error('Error generating financial summary:', error);
    res.status(500).json({ error: 'Failed to generate financial summary' });
  }
});

// Helper functions
const calculatePerformanceScore = (avgGrade, behavioralIncidents) => {
  const gradeScore = (avgGrade / 100) * 70; // 70% weight for academics
  const behaviorScore = Math.max(0, 30 - (behavioralIncidents * 5)); // 30% weight for behavior
  return Math.round((gradeScore + behaviorScore) * 100) / 100;
};

const generatePerformanceSummary = (performance) => {
  const totalCadets = performance.length;
  const avgGrade = performance.reduce((sum, p) => sum + p.performance_metrics.average_grade, 0) / totalCadets;
  const totalIncidents = performance.reduce((sum, p) => sum + p.performance_metrics.behavioral_incidents, 0);
  
  return {
    total_cadets: totalCadets,
    average_grade: Math.round(avgGrade * 100) / 100,
    total_incidents: totalIncidents,
    high_performers: performance.filter(p => p.performance_metrics.performance_score >= 80).length,
    at_risk_cadets: performance.filter(p => p.performance_metrics.performance_score < 60).length
  };
};

const getWorkloadLevel = (totalHours, assignments) => {
  if (totalHours > 40) return 'high';
  if (totalHours > 25) return 'medium';
  return 'low';
};

const generateWorkloadSummary = (workload) => {
  const totalStaff = workload.length;
  const avgHours = workload.reduce((sum, w) => sum + w.workload_metrics.total_hours, 0) / totalStaff;
  
  return {
    total_staff: totalStaff,
    average_hours: Math.round(avgHours * 100) / 100,
    high_workload: workload.filter(w => w.workload_metrics.workload_level === 'high').length,
    balanced_workload: workload.filter(w => w.workload_metrics.workload_level === 'medium').length,
    low_workload: workload.filter(w => w.workload_metrics.workload_level === 'low').length
  };
};

const generateEffectivenessRecommendations = (effectiveness) => {
  const recommendations = [];
  
  if (effectiveness.enrollment_metrics.graduation_rate < 80) {
    recommendations.push({
      area: 'Retention',
      recommendation: 'Focus on improving graduation rates through enhanced support programs',
      priority: 'high'
    });
  }
  
  if (effectiveness.academic_metrics.average_grade < 75) {
    recommendations.push({
      area: 'Academics',
      recommendation: 'Implement additional tutoring and academic support services',
      priority: 'medium'
    });
  }
  
  if (effectiveness.behavioral_metrics.incident_rate > 2) {
    recommendations.push({
      area: 'Behavior',
      recommendation: 'Develop targeted behavioral intervention strategies',
      priority: 'high'
    });
  }
  
  return recommendations;
};

module.exports = router;
