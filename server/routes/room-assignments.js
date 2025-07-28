
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Calculate astrology compatibility
function calculateAstrologyCompatibility(cadet1, cadet2) {
  if (!cadet1.birth_date || !cadet2.birth_date) {
    return { score: 0.5, reason: 'Missing birth data' };
  }

  const sign1 = getZodiacSign(cadet1.birth_date);
  const sign2 = getZodiacSign(cadet2.birth_date);
  const element1 = getElement(sign1);
  const element2 = getElement(sign2);

  // Element compatibility scoring
  let score = 0.5; // Default neutral
  let reason = `${sign1} (${element1}) with ${sign2} (${element2})`;

  if (element1 === element2) {
    score = 0.8; // Same element - high compatibility
    reason += ' - Same element compatibility';
  } else if (isComplementaryElement(element1, element2)) {
    score = 0.7; // Complementary elements
    reason += ' - Complementary elements';
  } else if (isChallengingElement(element1, element2)) {
    score = 0.3; // Challenging combination
    reason += ' - Challenging combination';
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

function isComplementaryElement(element1, element2) {
  const complementary = {
    'Fire': ['Air'],
    'Earth': ['Water'],
    'Air': ['Fire'],
    'Water': ['Earth']
  };
  return complementary[element1]?.includes(element2);
}

function isChallengingElement(element1, element2) {
  const challenging = {
    'Fire': ['Water'],
    'Earth': ['Air'],
    'Air': ['Earth'],
    'Water': ['Fire']
  };
  return challenging[element1]?.includes(element2);
}

// Calculate overall compatibility score
function calculateCompatibility(cadet1, cadet2) {
  let totalScore = 0;
  const factors = [];

  // Behavior compatibility (30% weight)
  const behaviorDiff = Math.abs(cadet1.behavior_score - cadet2.behavior_score);
  let behaviorScore = Math.max(0, (3 - behaviorDiff) / 3); // Higher score for similar behavior
  
  // Avoid pairing two high-risk cadets
  if (cadet1.behavior_score >= 4 && cadet2.behavior_score >= 4) {
    behaviorScore = 0.1; // Very low score
    factors.push('Both high-risk - not recommended');
  } else if ((cadet1.behavior_score <= 2 && cadet2.behavior_score >= 4) || 
             (cadet2.behavior_score <= 2 && cadet1.behavior_score >= 4)) {
    behaviorScore = 0.9; // Excellent mentorship pairing
    factors.push('Good mentor-mentee pairing');
  }
  
  totalScore += behaviorScore * 0.3;

  // Astrology compatibility (40% weight)
  const astroCompat = calculateAstrologyCompatibility(cadet1, cadet2);
  totalScore += astroCompat.score * 0.4;
  factors.push(astroCompat.reason);

  // Age compatibility (20% weight)
  const ageDiff = Math.abs(cadet1.age - cadet2.age);
  const ageScore = Math.max(0, (4 - ageDiff) / 4);
  totalScore += ageScore * 0.2;

  // Platoon preference (10% weight)
  const platoonScore = cadet1.platoon === cadet2.platoon ? 1 : 0.5;
  totalScore += platoonScore * 0.1;

  return {
    score: Math.min(1, Math.max(0, totalScore)),
    factors,
    recommendation: totalScore > 0.7 ? 'Excellent match' : 
                   totalScore > 0.5 ? 'Good compatibility' : 
                   totalScore > 0.3 ? 'Moderate compatibility' : 'Not recommended'
  };
}

// Get current room assignments
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT r.*, c.first_name, c.last_name, c.behavior_score, c.birth_date, c.platoon
    FROM room_assignments r
    LEFT JOIN cadets c ON r.cadet_id = c.id
    ORDER BY r.room_number, r.bed_number
  `, (err, assignments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Group by room
    const rooms = {};
    assignments.forEach(assignment => {
      if (!rooms[assignment.room_number]) {
        rooms[assignment.room_number] = [];
      }
      rooms[assignment.room_number].push(assignment);
    });
    
    res.json({ rooms, assignments });
  });
});

// Get room assignment suggestions
router.get('/suggestions/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;

  // Get the cadet
  db.get('SELECT * FROM cadets WHERE id = ? AND status = "active"', [cadetId], (err, cadet) => {
    if (err || !cadet) {
      return res.status(404).json({ error: 'Cadet not found' });
    }

    // Get unassigned cadets
    db.all(`
      SELECT c.* FROM cadets c
      LEFT JOIN room_assignments r ON c.id = r.cadet_id
      WHERE c.id != ? AND c.status = 'active' AND r.cadet_id IS NULL
    `, [cadetId], (err, availableCadets) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Calculate compatibility with each available cadet
      const suggestions = availableCadets.map(other => {
        const compatibility = calculateCompatibility(cadet, other);
        return {
          cadet: other,
          compatibility: compatibility.score,
          factors: compatibility.factors,
          recommendation: compatibility.recommendation,
          zodiac_sign: getZodiacSign(other.birth_date),
          element: getElement(getZodiacSign(other.birth_date))
        };
      })
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 10);

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

// Optimize all room assignments
router.post('/optimize', authenticateToken, (req, res) => {
  // Get all active cadets
  db.all(`
    SELECT * FROM cadets 
    WHERE status = 'active' 
    ORDER BY behavior_score ASC, birth_date
  `, (err, cadets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const roomSize = 2; // 2 cadets per room
    const optimizedRooms = [];
    const unassigned = [...cadets];
    let roomNumber = 1;

    // Prioritize pairing high-risk cadets with low-risk ones
    while (unassigned.length >= 2) {
      let bestPair = null;
      let bestScore = -1;
      let bestIndices = [];

      // Find the best compatible pair
      for (let i = 0; i < unassigned.length - 1; i++) {
        for (let j = i + 1; j < unassigned.length; j++) {
          const compatibility = calculateCompatibility(unassigned[i], unassigned[j]);
          if (compatibility.score > bestScore) {
            bestScore = compatibility.score;
            bestPair = [unassigned[i], unassigned[j]];
            bestIndices = [i, j];
          }
        }
      }

      if (bestPair && bestScore > 0.3) {
        const compatibility = calculateCompatibility(bestPair[0], bestPair[1]);
        optimizedRooms.push({
          room_number: roomNumber++,
          cadets: bestPair.map(cadet => ({
            ...cadet,
            zodiac_sign: getZodiacSign(cadet.birth_date),
            element: getElement(getZodiacSign(cadet.birth_date))
          })),
          compatibility_score: bestScore,
          factors: compatibility.factors,
          recommendation: compatibility.recommendation
        });

        // Remove assigned cadets (reverse order to maintain indices)
        unassigned.splice(bestIndices[1], 1);
        unassigned.splice(bestIndices[0], 1);
      } else if (unassigned.length === 1) {
        // Single cadet left
        optimizedRooms.push({
          room_number: roomNumber,
          cadets: [unassigned[0]],
          compatibility_score: null,
          factors: ['Single occupancy'],
          recommendation: 'Monitor for isolation'
        });
        break;
      } else {
        // No good pairs found, pair lowest scoring available
        const pair = unassigned.splice(0, 2);
        const compatibility = calculateCompatibility(pair[0], pair[1]);
        optimizedRooms.push({
          room_number: roomNumber++,
          cadets: pair,
          compatibility_score: compatibility.score,
          factors: compatibility.factors,
          recommendation: 'Requires supervision'
        });
      }
    }

    res.json({
      optimized_rooms: optimizedRooms,
      total_rooms: optimizedRooms.length,
      average_compatibility: optimizedRooms
        .filter(room => room.compatibility_score !== null)
        .reduce((sum, room) => sum + room.compatibility_score, 0) / 
        optimizedRooms.filter(room => room.compatibility_score !== null).length || 0,
      psychology_notes: [
        'High-risk cadets paired with positive role models for mentorship',
        'Astrology compatibility enhances natural rapport and communication',
        'Social learning theory applied to reduce negative peer influence'
      ]
    });
  });
});

// Apply room assignments
router.post('/assign', authenticateToken, (req, res) => {
  const { assignments } = req.body;

  db.serialize(() => {
    db.run('DELETE FROM room_assignments');

    const stmt = db.prepare(`
      INSERT INTO room_assignments (cadet_id, room_number, bed_number, assigned_date)
      VALUES (?, ?, ?, datetime('now'))
    `);

    assignments.forEach(room => {
      room.cadets.forEach((cadet, bedIndex) => {
        stmt.run(cadet.id, room.room_number, bedIndex + 1);
      });
    });

    stmt.finalize();
    res.json({ message: 'Room assignments updated successfully' });
  });
});

module.exports = router;
