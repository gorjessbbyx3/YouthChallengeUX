
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all mentorship logs
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT ml.*, c.name as cadet_name, s.name as mentor_name 
    FROM mentorship_logs ml
    LEFT JOIN cadets c ON ml.cadet_id = c.id
    LEFT JOIN staff s ON ml.mentor_id = s.id
    ORDER BY ml.date DESC
  `, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(logs);
  });
});

// Create new mentorship log
router.post('/', authenticateToken, (req, res) => {
  const { cadet_id, mentor_id, date, notes, session_type, goals_set, progress_rating } = req.body;
  
  db.run(
    `INSERT INTO mentorship_logs 
     (cadet_id, mentor_id, date, notes, session_type, goals_set, progress_rating) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cadet_id, mentor_id, date, notes, session_type, goals_set, progress_rating],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Get mentorship logs for specific cadet
router.get('/cadet/:cadetId', authenticateToken, (req, res) => {
  db.all(`
    SELECT ml.*, s.name as mentor_name 
    FROM mentorship_logs ml
    LEFT JOIN staff s ON ml.mentor_id = s.id
    WHERE ml.cadet_id = ?
    ORDER BY ml.date DESC
  `, [req.params.cadetId], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(logs);
  });
});

// Update mentorship log
router.put('/:id', authenticateToken, (req, res) => {
  const { notes, session_type, goals_set, progress_rating } = req.body;
  
  db.run(
    `UPDATE mentorship_logs 
     SET notes = ?, session_type = ?, goals_set = ?, progress_rating = ? 
     WHERE id = ?`,
    [notes, session_type, goals_set, progress_rating, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

module.exports = router;
