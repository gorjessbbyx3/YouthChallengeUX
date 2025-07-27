
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all cadets
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT c.*, s.name as mentor_name 
    FROM cadets c 
    LEFT JOIN staff s ON c.assigned_mentor_id = s.id
    ORDER BY c.behavior_score ASC, c.name
  `, (err, cadets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(cadets);
  });
});

// Create new cadet
router.post('/', authenticateToken, (req, res) => {
  const { 
    name, age, birth_date, birth_time, birth_location, 
    behavior_score, hiset_status, placement_status 
  } = req.body;
  
  db.run(`
    INSERT INTO cadets (name, age, birth_date, birth_time, birth_location, behavior_score, hiset_status, placement_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, age, birth_date, birth_time, birth_location, behavior_score || 3, hiset_status || 'not_started', placement_status || 'none'],
  function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Cadet created successfully' });
  });
});

// Update cadet
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  
  db.run(`UPDATE cadets SET ${fields} WHERE id = ?`, values, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ message: 'Cadet updated successfully' });
  });
});

// Get cadet risk prediction
router.get('/:id/risk', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT behavior_score, incidents FROM cadets WHERE id = ?', [id], (err, cadet) => {
    if (err || !cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }
    
    // Simple risk calculation (can be enhanced with AI)
    const riskScore = Math.min(10, (6 - cadet.behavior_score) * 2 + cadet.incidents);
    const riskLevel = riskScore >= 7 ? 'high' : riskScore >= 4 ? 'medium' : 'low';
    
    res.json({ 
      riskScore, 
      riskLevel,
      recommendations: getRiskRecommendations(riskLevel, cadet)
    });
  });
});

function getRiskRecommendations(riskLevel, cadet) {
  switch(riskLevel) {
    case 'high':
      return [
        'Assign experienced mentor immediately',
        'Consider room reassignment',
        'Increase supervision frequency',
        'Schedule counseling session'
      ];
    case 'medium':
      return [
        'Monitor peer interactions',
        'Provide additional support',
        'Check in weekly'
      ];
    default:
      return [
        'Continue current support level',
        'Consider peer mentoring role'
      ];
  }
}

module.exports = router;
