const express = require('express');
const router = express.Router();
const db = require('../database/init').getDatabase();
const { authenticateToken } = require('../middleware/auth');

// Get all inventory items with low stock alerts
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT *, 
           CASE WHEN quantity <= threshold THEN 1 ELSE 0 END as low_stock,
           CASE WHEN quantity <= threshold * 0.5 THEN 'critical' 
                WHEN quantity <= threshold THEN 'low' 
                ELSE 'normal' END as stock_status
    FROM inventory 
    ORDER BY stock_status DESC, name
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get inventory forecasting data
router.get('/forecasting/predictions', authenticateToken, async (req, res) => {
  try {
    // Get historical usage data
    db.all(`
      SELECT 
        i.id,
        i.name,
        i.quantity,
        i.threshold,
        i.category,
        COUNT(ul.id) as usage_count,
        AVG(ul.quantity_used) as avg_usage,
        MAX(ul.date) as last_usage_date
      FROM inventory i
      LEFT JOIN usage_logs ul ON i.id = ul.item_id
      WHERE ul.date >= date('now', '-90 days')
      GROUP BY i.id, i.name, i.quantity, i.threshold, i.category
    `, (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get cadet enrollment trends
      db.get(`
        SELECT 
          COUNT(*) as active_cadets,
          (SELECT COUNT(*) FROM cadets WHERE status = 'active' AND enrollment_date >= date('now', '-30 days')) as new_enrollments
        FROM cadets 
        WHERE status = 'active'
      `, (err, cadetData) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const predictions = items.map(item => {
          const prediction = generateInventoryForecast(item, cadetData);
          return prediction;
        });

        res.json({
          predictions,
          cadet_data: cadetData,
          generated_at: new Date().toISOString()
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock alerts
router.get('/alerts', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      id, name, quantity, threshold, category,
      CASE WHEN quantity = 0 THEN 'out_of_stock'
           WHEN quantity <= threshold * 0.5 THEN 'critical'
           WHEN quantity <= threshold THEN 'low'
           ELSE 'normal' END as alert_level
    FROM inventory 
    WHERE quantity <= threshold
    ORDER BY quantity ASC
  `, (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(alerts);
  });
});

// Record usage of an item
router.post('/:id/usage', authenticateToken, (req, res) => {
  const { quantity_used, purpose, staff_id } = req.body;
  const item_id = req.params.id;

  db.serialize(() => {
    // Record usage
    db.run(
      'INSERT INTO usage_logs (item_id, quantity_used, purpose, staff_id, date) VALUES (?, ?, ?, ?, datetime("now"))',
      [item_id, quantity_used, purpose, staff_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Update inventory quantity
        db.run(
          'UPDATE inventory SET quantity = quantity - ?, updated_at = datetime("now") WHERE id = ?',
          [quantity_used, item_id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Usage recorded and inventory updated' });
          }
        );
      }
    );
  });
});

// Restock item
router.post('/:id/restock', authenticateToken, (req, res) => {
  const { quantity_added, cost, supplier, staff_id } = req.body;
  const item_id = req.params.id;

  db.serialize(() => {
    // Record restock
    db.run(
      'INSERT INTO restock_logs (item_id, quantity_added, cost, supplier, staff_id, date) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [item_id, quantity_added, cost, supplier, staff_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Update inventory quantity and last restocked date
        db.run(
          'UPDATE inventory SET quantity = quantity + ?, last_restocked = datetime("now"), updated_at = datetime("now") WHERE id = ?',
          [quantity_added, item_id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Restock recorded and inventory updated' });
          }
        );
      }
    );
  });
});

// Get inventory item by ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM inventory WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(row);
  });
});

// Create new inventory item
router.post('/', authenticateToken, (req, res) => {
  const { name, quantity, threshold, category, unit_cost } = req.body;

  // Validate inputs
  if (!name || quantity < 0 || threshold < 0) {
    return res.status(400).json({ error: 'Invalid input: name required, quantities must be non-negative' });
  }

  db.run(
    'INSERT INTO inventory (name, quantity, threshold, category, unit_cost, last_restocked) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [name, quantity || 0, threshold || 0, category, unit_cost || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Item created successfully' });
    }
  );
});

// Update inventory item
router.put('/:id', authenticateToken, (req, res) => {
  const { name, quantity, threshold, category, unit_cost } = req.body;

  // Validate inputs
  if (quantity < 0 || threshold < 0) {
    return res.status(400).json({ error: 'Quantities must be non-negative' });
  }

  db.run(
    'UPDATE inventory SET name = ?, quantity = ?, threshold = ?, category = ?, unit_cost = ?, updated_at = datetime("now") WHERE id = ?',
    [name, quantity, threshold, category, unit_cost, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ message: 'Item updated successfully' });
    }
  );
});

// Delete inventory item
router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  });
});

// AI-powered inventory forecasting function
function generateInventoryForecast(item, cadetData) {
  const { 
    id, name, quantity, threshold, category, 
    usage_count = 0, avg_usage = 0, last_usage_date 
  } = item;

  const { active_cadets = 0, new_enrollments = 0 } = cadetData;

  // Calculate usage patterns based on category and cadet count
  let dailyUsageRate = 0;
  let seasonalMultiplier = 1;

  // Category-specific usage calculations
  switch (category?.toLowerCase()) {
    case 'uniforms':
      // Uniforms typically needed for new cadets + replacements
      dailyUsageRate = (new_enrollments * 0.8) + (active_cadets * 0.02); // 80% of new cadets + 2% replacement rate
      break;
    case 'hiset_books':
      // Books needed based on academic progression
      dailyUsageRate = active_cadets * 0.05; // 5% of cadets get new books daily
      break;
    case 'training_equipment':
      // Equipment wear based on usage intensity
      dailyUsageRate = Math.max(avg_usage || 0, active_cadets * 0.01); // 1% daily wear rate
      break;
    default:
      dailyUsageRate = avg_usage || (active_cadets * 0.01);
  }

  // Account for seasonal patterns (higher usage at cycle starts)
  const dayOfYear = new Date().getDayOfYear();
  if (dayOfYear % 90 < 14) { // First 2 weeks of quarter (cycle start)
    seasonalMultiplier = 1.5;
  }

  const adjustedDailyUsage = dailyUsageRate * seasonalMultiplier;

  // Calculate days until reorder needed
  const daysUntilThreshold = quantity > threshold ? 
    Math.floor((quantity - threshold) / Math.max(adjustedDailyUsage, 0.1)) : 0;

  const daysUntilEmpty = Math.floor(quantity / Math.max(adjustedDailyUsage, 0.1));

  // Risk assessment
  let riskLevel = 'low';
  let confidence = 0.8;

  if (daysUntilEmpty <= 7) {
    riskLevel = 'critical';
    confidence = 0.95;
  } else if (daysUntilEmpty <= 14) {
    riskLevel = 'high';
    confidence = 0.9;
  } else if (daysUntilThreshold <= 7) {
    riskLevel = 'medium';
    confidence = 0.85;
  }

  // Generate recommendations
  const recommendations = [];

  if (riskLevel === 'critical') {
    recommendations.push('URGENT: Reorder immediately - risk of stockout within 7 days');
    recommendations.push(`Order ${Math.ceil(threshold * 2)} units for safety stock`);
  } else if (riskLevel === 'high') {
    recommendations.push('Schedule reorder within 3-5 days');
    recommendations.push(`Recommended order quantity: ${Math.ceil(threshold * 1.5)} units`);
  } else if (riskLevel === 'medium') {
    recommendations.push('Monitor closely and prepare for reorder');
    recommendations.push(`Standard reorder quantity: ${threshold} units`);
  } else {
    recommendations.push('Stock levels adequate');
    recommendations.push('Continue normal monitoring');
  }

  return {
    item_id: id,
    item_name: name,
    current_quantity: quantity,
    threshold,
    category,
    forecast: {
      daily_usage_rate: Math.round(adjustedDailyUsage * 10) / 10,
      days_until_threshold: daysUntilThreshold,
      days_until_empty: daysUntilEmpty,
      risk_level: riskLevel,
      confidence_score: confidence,
      seasonal_factor: seasonalMultiplier
    },
    recommendations,
    last_updated: new Date().toISOString()
  };
}

// Helper function for date calculations
Date.prototype.getDayOfYear = function() {
  const start = new Date(this.getFullYear(), 0, 0);
  const diff = this - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

module.exports = router;