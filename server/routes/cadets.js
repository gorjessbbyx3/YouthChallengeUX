
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
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all cadets
router.get('/', authenticateToken, (req, res) => {
  const { platoon, hiset_status, behavior_score, status = 'active' } = req.query;
  
  let query = 'SELECT * FROM cadets WHERE status = ?';
  let params = [status];
  
  if (platoon) {
    query += ' AND platoon = ?';
    params.push(platoon);
  }
  
  if (hiset_status) {
    query += ' AND hiset_status = ?';
    params.push(hiset_status);
  }
  
  if (behavior_score) {
    query += ' AND behavior_score = ?';
    params.push(parseInt(behavior_score));
  }
  
  query += ' ORDER BY last_name, first_name';
  
  db.all(query, params, (err, cadets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(cadets);
  });
});

// Get single cadet
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM cadets WHERE id = ?', [req.params.id], (err, cadet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }
    res.json(cadet);
  });
});

// Create new cadet
router.post('/', authenticateToken, (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    phone,
    email,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    platoon,
    rank = 'Recruit',
    behavior_score = 3,
    hiset_status = 'not_started',
    placement_status = 'active'
  } = req.body;
  
  // Validate required fields
  if (!first_name || !last_name || !platoon) {
    return res.status(400).json({ error: 'First name, last name, and platoon are required' });
  }
  
  // Validate behavior score
  if (behavior_score < 1 || behavior_score > 5) {
    return res.status(400).json({ error: 'Behavior score must be between 1 and 5' });
  }
  
  db.run(
    `INSERT INTO cadets 
     (first_name, last_name, date_of_birth, phone, email, address, 
      emergency_contact_name, emergency_contact_phone, platoon, rank, 
      behavior_score, hiset_status, placement_status, enrollment_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`,
    [
      first_name, last_name, date_of_birth, phone, email, address,
      emergency_contact_name, emergency_contact_phone, platoon, rank,
      behavior_score, hiset_status, placement_status
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update cadet
router.put('/:id', authenticateToken, (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    phone,
    email,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    platoon,
    rank,
    behavior_score,
    hiset_status,
    placement_status,
    notes
  } = req.body;
  
  // Validate behavior score if provided
  if (behavior_score && (behavior_score < 1 || behavior_score > 5)) {
    return res.status(400).json({ error: 'Behavior score must be between 1 and 5' });
  }
  
  db.run(
    `UPDATE cadets 
     SET first_name = ?, last_name = ?, date_of_birth = ?, phone = ?, email = ?, 
         address = ?, emergency_contact_name = ?, emergency_contact_phone = ?, 
         platoon = ?, rank = ?, behavior_score = ?, hiset_status = ?, 
         placement_status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      first_name, last_name, date_of_birth, phone, email, address,
      emergency_contact_name, emergency_contact_phone, platoon, rank,
      behavior_score, hiset_status, placement_status, notes, req.params.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

// Get cadet statistics
router.get('/stats/overview', authenticateToken, (req, res) => {
  const stats = {};
  
  // Total active cadets
  db.get('SELECT COUNT(*) as count FROM cadets WHERE status = "active"', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.total = result.count;
    
    // High risk cadets (behavior score 4-5)
    db.get('SELECT COUNT(*) as count FROM cadets WHERE status = "active" AND behavior_score >= 4', (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.highRisk = result.count;
      
      // HiSET completion stats
      db.get('SELECT COUNT(*) as count FROM cadets WHERE hiset_status = "completed"', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.hisetCompleted = result.count;
        
        // Placement stats
        db.get('SELECT COUNT(*) as count FROM cadets WHERE placement_status IN ("workforce", "education", "military")', (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.successfulPlacements = result.count;
          
          // Calculate rates
          stats.hisetCompletionRate = stats.total > 0 ? ((stats.hisetCompleted / stats.total) * 100).toFixed(1) : 0;
          stats.placementRate = stats.total > 0 ? ((stats.successfulPlacements / stats.total) * 100).toFixed(1) : 0;
          
          res.json(stats);
        });
      });
    });
  });
});

// Get at-risk cadets for intervention
router.get('/at-risk/intervention', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.*, COUNT(bt.id) as recent_incidents
     FROM cadets c
     LEFT JOIN behavioral_tracking bt ON c.id = bt.cadet_id 
       AND bt.incident_date >= date('now', '-30 days')
     WHERE c.status = 'active' 
       AND (c.behavior_score >= 4 OR COUNT(bt.id) >= 2)
     GROUP BY c.id
     ORDER BY c.behavior_score DESC, recent_incidents DESC`,
    (err, cadets) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(cadets);
    }
  );
});

// Get positive role models
router.get('/role-models/available', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.*, COUNT(bt.id) as incident_count
     FROM cadets c
     LEFT JOIN behavioral_tracking bt ON c.id = bt.cadet_id 
       AND bt.incident_date >= date('now', '-90 days')
     WHERE c.status = 'active' 
       AND c.behavior_score <= 2
     GROUP BY c.id
     HAVING incident_count = 0
     ORDER BY c.behavior_score ASC, c.enrollment_date ASC`,
    (err, cadets) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(cadets);
    }
  );
});

// Bulk behavior score update
router.post('/bulk-behavior-update', authenticateToken, (req, res) => {
  const { updates, reason } = req.body;
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates must be an array' });
  }
  
  const updatePromises = updates.map(update => {
    return new Promise((resolve, reject) => {
      const { cadet_id, behavior_score } = update;
      
      if (behavior_score < 1 || behavior_score > 5) {
        return reject(new Error(`Invalid behavior score for cadet ${cadet_id}`));
      }
      
      db.run(
        'UPDATE cadets SET behavior_score = ?, updated_at = datetime("now") WHERE id = ?',
        [behavior_score, cadet_id],
        function(err) {
          if (err) return reject(err);
          
          // Log the behavior change
          if (reason) {
            db.run(
              `INSERT INTO behavioral_tracking 
               (cadet_id, incident_date, incident_type, severity, description, action_taken) 
               VALUES (?, date('now'), 'Score Update', ?, ?, 'Behavior score updated')`,
              [cadet_id, behavior_score, reason]
            );
          }
          
          resolve({ cadet_id, behavior_score });
        }
      );
    });
  });
  
  Promise.all(updatePromises)
    .then(results => res.json({ updated: results.length, results }))
    .catch(error => res.status(500).json({ error: error.message }));
});

module.exports = router;
