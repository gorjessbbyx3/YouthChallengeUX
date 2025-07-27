
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Simple astrology compatibility calculation
function calculateCompatibility(person1, person2) {
  if (!person1.birth_date || !person2.birth_date) return 0.5;
  
  // Simplified compatibility based on birth month (representing sun signs)
  const month1 = new Date(person1.birth_date).getMonth();
  const month2 = new Date(person2.birth_date).getMonth();
  
  // Elements: Fire (0,3,7), Earth (1,4,8), Air (2,5,9), Water (6,10,11)
  const getElement = (month) => {
    if ([0,3,7].includes(month)) return 'fire';
    if ([1,4,8].includes(month)) return 'earth';
    if ([2,5,9].includes(month)) return 'air';
    return 'water';
  };
  
  const element1 = getElement(month1);
  const element2 = getElement(month2);
  
  // Compatibility matrix
  const compatibility = {
    fire: { fire: 0.8, earth: 0.4, air: 0.9, water: 0.3 },
    earth: { fire: 0.4, earth: 0.7, air: 0.3, water: 0.8 },
    air: { fire: 0.9, earth: 0.3, air: 0.8, water: 0.4 },
    water: { fire: 0.3, earth: 0.8, air: 0.4, water: 0.9 }
  };
  
  return compatibility[element1][element2];
}

// Get room assignment suggestions
router.get('/room-suggestions/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.get('SELECT * FROM cadets WHERE id = ?', [cadetId], (err, cadet) => {
    if (err || !cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }
    
    // Get all other cadets for compatibility analysis
    db.all('SELECT * FROM cadets WHERE id != ? AND room_assignment IS NULL', [cadetId], (err, otherCadets) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const suggestions = otherCadets.map(other => ({
        cadet: other,
        compatibility: calculateCompatibility(cadet, other),
        behaviorCompatibility: Math.abs(cadet.behavior_score - other.behavior_score) <= 1 ? 0.8 : 0.3
      }))
      .sort((a, b) => (b.compatibility + b.behaviorCompatibility) - (a.compatibility + a.behaviorCompatibility))
      .slice(0, 5);
      
      res.json({ cadet, suggestions });
    });
  });
});

// Get mentor assignment suggestions
router.get('/mentor-suggestions/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.get('SELECT * FROM cadets WHERE id = ?', [cadetId], (err, cadet) => {
    if (err || !cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }
    
    db.all('SELECT * FROM staff WHERE role IN (?, ?)', ['mentor', 'staff'], (err, staff) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const suggestions = staff.map(mentor => ({
        mentor,
        compatibility: calculateCompatibility(cadet, mentor),
        experienceBonus: mentor.experience_years >= 3 ? 0.3 : 0,
        currentLoad: 0 // TODO: Calculate current mentee count
      }))
      .map(item => ({
        ...item,
        totalScore: item.compatibility + item.experienceBonus - (item.currentLoad * 0.1)
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);
      
      res.json({ cadet, suggestions });
    });
  });
});

// Create assignment
router.post('/', authenticateToken, (req, res) => {
  const { cadet_id, staff_id, assignment_type } = req.body;
  
  // Calculate compatibility score
  db.get('SELECT * FROM cadets WHERE id = ?', [cadet_id], (err, cadet) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT * FROM staff WHERE id = ?', [staff_id], (err, staff) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const compatibility = calculateCompatibility(cadet, staff);
      
      db.run(`
        INSERT INTO assignments (cadet_id, staff_id, assignment_type, compatibility_score)
        VALUES (?, ?, ?, ?)
      `, [cadet_id, staff_id, assignment_type, compatibility], function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        
        // Update cadet's assigned mentor if this is a mentorship assignment
        if (assignment_type === 'mentor') {
          db.run('UPDATE cadets SET assigned_mentor_id = ? WHERE id = ?', [staff_id, cadet_id]);
        }
        
        res.status(201).json({ 
          id: this.lastID, 
          compatibility_score: compatibility,
          message: 'Assignment created successfully' 
        });
      });
    });
  });
});

module.exports = router;
