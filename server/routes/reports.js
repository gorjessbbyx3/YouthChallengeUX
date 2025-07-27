
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
