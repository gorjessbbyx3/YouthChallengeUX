
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Calculate supervisor compatibility (Staff Sun sign with Cadet Moon sign approach)
function calculateSupervisorCompatibility(cadet, staff) {
  if (!cadet.birth_date || !staff.birth_date) {
    return { score: 0.5, reason: 'Missing birth data' };
  }

  const cadetSign = getZodiacSign(cadet.birth_date);
  const staffSign = getZodiacSign(staff.birth_date);
  const cadetElement = getElement(cadetSign);
  const staffElement = getElement(staffSign);

  // For supervisor relationships, we look for complementary or supportive elements
  let score = 0.5;
  let reason = `Staff ${staffSign} (${staffElement}) supervising ${cadetSign} (${cadetElement}) cadet`;

  // Earth signs are good supervisors for most
  if (staffElement === 'Earth') {
    score = 0.7;
    reason += ' - Earth staff provides stability and structure';
  }

  // Water signs provide emotional support
  if (staffElement === 'Water' && (cadetElement === 'Fire' || cadetElement === 'Water')) {
    score = 0.8;
    reason += ' - Water staff provides emotional support';
  }

  // Fire signs motivate earth and air cadets
  if (staffElement === 'Fire' && (cadetElement === 'Earth' || cadetElement === 'Air')) {
    score = 0.7;
    reason += ' - Fire staff provides motivation and energy';
  }

  // Air signs communicate well with fire and air cadets
  if (staffElement === 'Air' && (cadetElement === 'Fire' || cadetElement === 'Air')) {
    score = 0.7;
    reason += ' - Air staff provides clear communication';
  }

  // Same element understanding
  if (staffElement === cadetElement) {
    score = 0.8;
    reason += ' - Same element provides natural understanding';
  }

  return { score, reason };
}

function getZodiacSign(birthDate) {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittarius';
  if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 'Capricorn';
  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

function getElement(sign) {
  const elements = {
    'Aries': 'Fire', 'Leo': 'Fire', 'Sagittarius': 'Fire',
    'Taurus': 'Earth', 'Virgo': 'Earth', 'Capricorn': 'Earth',
    'Gemini': 'Air', 'Libra': 'Air', 'Aquarius': 'Air',
    'Cancer': 'Water', 'Scorpio': 'Water', 'Pisces': 'Water'
  };
  return elements[sign] || 'Unknown';
}

// Calculate overall supervisor compatibility
function calculateOverallCompatibility(cadet, staff) {
  let totalScore = 0;
  const factors = [];

  // Experience weight (40% - prioritize experienced staff for high-risk cadets)
  let experienceScore = Math.min(staff.experience_years / 5, 1); // Cap at 5 years
  if (cadet.behavior_score >= 4 && staff.experience_years >= 3) {
    experienceScore = 1; // Maximum score for experienced staff with high-risk cadets
    factors.push(`Experienced staff (${staff.experience_years}yr) for high-risk cadet`);
  } else if (cadet.behavior_score >= 4 && staff.experience_years < 3) {
    experienceScore = 0.3; // Low score for inexperienced staff with high-risk cadets
    factors.push(`Inexperienced staff for high-risk cadet - not ideal`);
  }
  totalScore += experienceScore * 0.4;

  // Astrology compatibility (35% weight)
  const astroCompat = calculateSupervisorCompatibility(cadet, staff);
  totalScore += astroCompat.score * 0.35;
  factors.push(astroCompat.reason);

  // Current workload (15% weight)
  const workloadScore = Math.max(0, 1 - (staff.current_assignments || 0) / 5); // Penalize high workload
  totalScore += workloadScore * 0.15;
  if (staff.current_assignments >= 4) {
    factors.push(`High workload (${staff.current_assignments} assignments)`);
  }

  // Role appropriateness (10% weight)
  let roleScore = 0.5;
  if (staff.role === 'mentor' || staff.role === 'counselor') {
    roleScore = 1;
    factors.push('Appropriate mentoring role');
  } else if (staff.role === 'instructor' && cadet.hiset_status !== 'completed') {
    roleScore = 0.8;
    factors.push('Academic support role');
  }
  totalScore += roleScore * 0.1;

  return {
    score: Math.min(1, Math.max(0, totalScore)),
    factors,
    recommendation: totalScore > 0.8 ? 'Excellent match' : 
                   totalScore > 0.6 ? 'Good match' : 
                   totalScore > 0.4 ? 'Moderate match' : 'Not recommended'
  };
}

// Get supervisor assignment suggestions for a cadet
router.get('/suggestions/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;

  // Get the cadet
  db.get('SELECT * FROM cadets WHERE id = ? AND status = "active"', [cadetId], (err, cadet) => {
    if (err || !cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }

    // Get available staff with current assignment counts
    db.all(`
      SELECT s.*, 
             COUNT(sa.id) as current_assignments,
             AVG(CASE WHEN sa.effectiveness_rating IS NOT NULL THEN sa.effectiveness_rating ELSE 3 END) as avg_rating
      FROM staff s
      LEFT JOIN supervisor_assignments sa ON s.id = sa.staff_id AND sa.status = 'active'
      WHERE s.status = 'active' AND s.role IN ('mentor', 'counselor', 'instructor')
      GROUP BY s.id
      ORDER BY s.experience_years DESC
    `, (err, staff) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Calculate compatibility with each staff member
      const suggestions = staff.map(staffMember => {
        const compatibility = calculateOverallCompatibility(cadet, {
          ...staffMember,
          current_assignments: staffMember.current_assignments || 0
        });
        
        return {
          staff: {
            ...staffMember,
            zodiac_sign: getZodiacSign(staffMember.birth_date),
            element: getElement(getZodiacSign(staffMember.birth_date))
          },
          compatibility: compatibility.score,
          factors: compatibility.factors,
          recommendation: compatibility.recommendation,
          current_load: staffMember.current_assignments || 0,
          avg_effectiveness: staffMember.avg_rating || 3
        };
      })
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 5);

      res.json({
        cadet: {
          ...cadet,
          zodiac_sign: getZodiacSign(cadet.birth_date),
          element: getElement(getZodiacSign(cadet.birth_date))
        },
        suggestions
      });
    });
  });
});

// Get current supervisor assignments
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT sa.*, 
           c.first_name as cadet_first_name, c.last_name as cadet_last_name, 
           c.behavior_score, c.birth_date as cadet_birth_date,
           s.name as supervisor_name, s.role, s.experience_years,
           s.birth_date as supervisor_birth_date
    FROM supervisor_assignments sa
    JOIN cadets c ON sa.cadet_id = c.id
    JOIN staff s ON sa.staff_id = s.id
    WHERE sa.status = 'active'
    ORDER BY s.name, c.last_name
  `, (err, assignments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(assignments);
  });
});

// Create supervisor assignment
router.post('/', authenticateToken, (req, res) => {
  const { cadet_id, staff_id, assignment_type = 'supervision' } = req.body;

  // Calculate compatibility for the assignment
  db.get('SELECT * FROM cadets WHERE id = ?', [cadet_id], (err, cadet) => {
    if (err || !cadet) return res.status(404).json({ error: 'Cadet not found' });

    db.get('SELECT * FROM staff WHERE id = ?', [staff_id], (err, staff) => {
      if (err || !staff) return res.status(404).json({ error: 'Staff not found' });

      const compatibility = calculateOverallCompatibility(cadet, staff);

      db.run(`
        INSERT INTO supervisor_assignments 
        (cadet_id, staff_id, assignment_type, compatibility_score, assigned_date, status)
        VALUES (?, ?, ?, ?, datetime('now'), 'active')
      `, [cadet_id, staff_id, assignment_type, compatibility.score], function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        res.status(201).json({
          id: this.lastID,
          compatibility_score: compatibility.score,
          factors: compatibility.factors,
          recommendation: compatibility.recommendation,
          message: 'Supervisor assignment created successfully'
        });
      });
    });
  });
});

// Update assignment effectiveness rating
router.put('/:id/effectiveness', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { effectiveness_rating, notes } = req.body;

  db.run(`
    UPDATE supervisor_assignments 
    SET effectiveness_rating = ?, notes = ?, updated_date = datetime('now')
    WHERE id = ?
  `, [effectiveness_rating, notes, id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Effectiveness rating updated successfully' });
  });
});

module.exports = router;
