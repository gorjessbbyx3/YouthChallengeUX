
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

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
