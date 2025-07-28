
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY name', (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(items);
  });
});

// Create new inventory item
router.post('/', authenticateToken, (req, res) => {
  const { name, category, quantity, threshold, unit_cost, supplier, usage_rate } = req.body;
  
  db.run(
    `INSERT INTO inventory 
     (name, category, quantity, threshold, unit_cost, supplier, usage_rate) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, category, quantity, threshold, unit_cost, supplier, usage_rate || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update inventory item
router.put('/:id', authenticateToken, (req, res) => {
  const { name, category, quantity, threshold, unit_cost, supplier, usage_rate } = req.body;
  
  db.run(
    `UPDATE inventory 
     SET name = ?, category = ?, quantity = ?, threshold = ?, unit_cost = ?, supplier = ?, usage_rate = ? 
     WHERE id = ?`,
    [name, category, quantity, threshold, unit_cost, supplier, usage_rate, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

// Update item quantity (for usage tracking)
router.patch('/:id/quantity', authenticateToken, (req, res) => {
  const { quantity_change, reason } = req.body;
  
  // Validate quantity change
  if (typeof quantity_change !== 'number') {
    return res.status(400).json({ error: 'Quantity change must be a number' });
  }
  
  db.get('SELECT * FROM inventory WHERE id = ?', [req.params.id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const newQuantity = item.quantity + quantity_change;
    
    // Prevent negative quantities
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Cannot have negative inventory' });
    }
    
    db.run(
      'UPDATE inventory SET quantity = ?, last_updated = datetime("now") WHERE id = ?',
      [newQuantity, req.params.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Log the transaction
        db.run(
          `INSERT INTO inventory_transactions 
           (item_id, quantity_change, reason, new_quantity, created_at) 
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [req.params.id, quantity_change, reason, newQuantity]
        );
        
        // Update usage rate if this is consumption
        if (quantity_change < 0) {
          updateUsageRate(req.params.id, Math.abs(quantity_change));
        }
        
        res.json({ newQuantity, updated: this.changes });
      }
    );
  });
});

// Auto-update usage rates based on consumption patterns
function updateUsageRate(itemId, consumed) {
  // Get recent transactions to calculate daily usage
  db.all(
    `SELECT quantity_change, created_at 
     FROM inventory_transactions 
     WHERE item_id = ? AND quantity_change < 0 
     AND created_at >= date('now', '-30 days')
     ORDER BY created_at DESC`,
    [itemId],
    (err, transactions) => {
      if (err) return;
      
      if (transactions.length > 0) {
        const totalConsumed = transactions.reduce((sum, t) => sum + Math.abs(t.quantity_change), 0);
        const daysCovered = Math.max(1, transactions.length);
        const newUsageRate = totalConsumed / daysCovered;
        
        db.run(
          'UPDATE inventory SET usage_rate = ? WHERE id = ?',
          [Math.round(newUsageRate * 100) / 100, itemId] // Round to 2 decimal places
        );
      }
    }
  );
}

// Bulk update for intake periods
router.post('/bulk-update', authenticateToken, (req, res) => {
  const { updates, reason = 'Bulk intake update' } = req.body;
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates must be an array' });
  }
  
  const updatePromises = updates.map(update => {
    return new Promise((resolve, reject) => {
      const { id, quantity_change } = update;
      
      db.get('SELECT quantity FROM inventory WHERE id = ?', [id], (err, item) => {
        if (err) return reject(err);
        
        const newQuantity = item.quantity + quantity_change;
        if (newQuantity < 0) return reject(new Error(`Negative quantity for item ${id}`));
        
        db.run(
          'UPDATE inventory SET quantity = ?, last_updated = datetime("now") WHERE id = ?',
          [newQuantity, id],
          function(err) {
            if (err) return reject(err);
            
            // Log transaction
            db.run(
              `INSERT INTO inventory_transactions 
               (item_id, quantity_change, reason, new_quantity, created_at) 
               VALUES (?, ?, ?, ?, datetime('now'))`,
              [id, quantity_change, reason, newQuantity],
              (err) => {
                if (err) return reject(err);
                resolve({ id, newQuantity });
              }
            );
          }
        );
      });
    });
  });
  
  Promise.all(updatePromises)
    .then(results => res.json({ updated: results.length, results }))
    .catch(error => res.status(500).json({ error: error.message }));
});

// Get low stock items
router.get('/low-stock', authenticateToken, (req, res) => {
  db.all('SELECT * FROM inventory WHERE quantity <= threshold', (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(items);
  });
});

module.exports = router;
