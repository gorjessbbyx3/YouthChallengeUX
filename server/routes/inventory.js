
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
  
  db.get('SELECT quantity FROM inventory WHERE id = ?', [req.params.id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const newQuantity = item.quantity + quantity_change;
    
    db.run(
      'UPDATE inventory SET quantity = ? WHERE id = ?',
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
        
        res.json({ newQuantity });
      }
    );
  });
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
