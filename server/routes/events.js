
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all events
router.get('/', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  let query = 'SELECT * FROM events';
  let params = [];
  
  if (start_date && end_date) {
    query += ' WHERE start_date >= ? AND end_date <= ?';
    params = [start_date, end_date];
  }
  
  query += ' ORDER BY start_date ASC';
  
  db.all(query, params, (err, events) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(events);
  });
});

// Create new event
router.post('/', authenticateToken, (req, res) => {
  const { 
    title, 
    description, 
    event_type, 
    start_date, 
    end_date, 
    location, 
    required_staff, 
    assigned_staff, 
    community_service_hours 
  } = req.body;
  
  db.run(
    `INSERT INTO events 
     (title, description, event_type, start_date, end_date, location, required_staff, assigned_staff, community_service_hours) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title, 
      description, 
      event_type, 
      start_date, 
      end_date, 
      location, 
      required_staff, 
      JSON.stringify(assigned_staff || []), 
      community_service_hours || 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update event
router.put('/:id', authenticateToken, (req, res) => {
  const { 
    title, 
    description, 
    event_type, 
    start_date, 
    end_date, 
    location, 
    required_staff, 
    assigned_staff, 
    community_service_hours 
  } = req.body;
  
  db.run(
    `UPDATE events 
     SET title = ?, description = ?, event_type = ?, start_date = ?, end_date = ?, 
         location = ?, required_staff = ?, assigned_staff = ?, community_service_hours = ? 
     WHERE id = ?`,
    [
      title, 
      description, 
      event_type, 
      start_date, 
      end_date, 
      location, 
      required_staff, 
      JSON.stringify(assigned_staff || []), 
      community_service_hours || 0, 
      req.params.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

// Get staff schedule conflicts
router.get('/conflicts/:staffId', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  db.all(`
    SELECT e.* FROM events e 
    WHERE JSON_EXTRACT(e.assigned_staff, '$') LIKE '%' || ? || '%'
    AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))
    ORDER BY start_date
  `, [req.params.staffId, start_date, end_date, start_date, end_date], (err, conflicts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(conflicts);
  });
});

module.exports = router;
