
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all staff
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM staff', (err, staff) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(staff);
  });
});

// Create new staff member
router.post('/', authenticateToken, (req, res) => {
  const { name, role, email, phone, availability, experience_level } = req.body;
  
  db.run(
    'INSERT INTO staff (name, role, email, phone, availability, experience_level) VALUES (?, ?, ?, ?, ?, ?)',
    [name, role, email, phone, JSON.stringify(availability), experience_level],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update staff member
router.put('/:id', authenticateToken, (req, res) => {
  const { name, role, email, phone, availability, experience_level } = req.body;
  
  db.run(
    'UPDATE staff SET name = ?, role = ?, email = ?, phone = ?, availability = ?, experience_level = ? WHERE id = ?',
    [name, role, email, phone, JSON.stringify(availability), experience_level, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

// Delete staff member
router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM staff WHERE id = ?', req.params.id, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
