
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Calculate compatibility score between two cadets
function calculateCompatibility(cadet1, cadet2) {
  let score = 0;
  
  // Behavior compatibility (similar scores work better)
  const behaviorDiff = Math.abs(cadet1.behavior_score - cadet2.behavior_score);
  score += (5 - behaviorDiff) * 20; // 0-100 points
  
  // Age compatibility
  const ageDiff = Math.abs(cadet1.age - cadet2.age);
  score += Math.max(0, (3 - ageDiff)) * 10; // Prefer similar ages
  
  // Risk level compatibility
  if (cadet1.risk_level === 'high' && cadet2.risk_level === 'high') {
    score -= 30; // Avoid pairing two high-risk cadets
  } else if (cadet1.risk_level === 'low' && cadet2.risk_level === 'high') {
    score += 20; // Good pairing for mentorship
  }
  
  // Astrology compatibility (simplified)
  if (cadet1.birth_date && cadet2.birth_date) {
    const sign1 = getZodiacSign(cadet1.birth_date);
    const sign2 = getZodiacSign(cadet2.birth_date);
    
    const compatibility = getAstrologyCompatibility(sign1, sign2);
    score += compatibility * 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

function getZodiacSign(birthDate) {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'aries';
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'taurus';
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'gemini';
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'cancer';
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'leo';
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'virgo';
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'libra';
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'scorpio';
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'sagittarius';
  if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 'capricorn';
  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'aquarius';
  return 'pisces';
}

function getAstrologyCompatibility(sign1, sign2) {
  const compatibilityMatrix = {
    'aries': { 'leo': 4, 'sagittarius': 4, 'gemini': 3, 'aquarius': 3 },
    'taurus': { 'virgo': 4, 'capricorn': 4, 'cancer': 3, 'pisces': 3 },
    'gemini': { 'libra': 4, 'aquarius': 4, 'aries': 3, 'leo': 3 },
    'cancer': { 'scorpio': 4, 'pisces': 4, 'taurus': 3, 'virgo': 3 },
    'leo': { 'aries': 4, 'sagittarius': 4, 'gemini': 3, 'libra': 3 },
    'virgo': { 'taurus': 4, 'capricorn': 4, 'cancer': 3, 'scorpio': 3 },
    'libra': { 'gemini': 4, 'aquarius': 4, 'leo': 3, 'sagittarius': 3 },
    'scorpio': { 'cancer': 4, 'pisces': 4, 'virgo': 3, 'capricorn': 3 },
    'sagittarius': { 'aries': 4, 'leo': 4, 'libra': 3, 'aquarius': 3 },
    'capricorn': { 'taurus': 4, 'virgo': 4, 'scorpio': 3, 'pisces': 3 },
    'aquarius': { 'gemini': 4, 'libra': 4, 'aries': 3, 'sagittarius': 3 },
    'pisces': { 'cancer': 4, 'scorpio': 4, 'taurus': 3, 'capricorn': 3 }
  };
  
  return compatibilityMatrix[sign1]?.[sign2] || 2; // Default neutral compatibility
}

// Get room assignments with compatibility scores
router.get('/rooms', authenticateToken, (req, res) => {
  db.all(`
    SELECT c.*, r.room_number, r.bed_number
    FROM cadets c
    LEFT JOIN room_assignments r ON c.id = r.cadet_id
    WHERE c.status = 'active'
    ORDER BY r.room_number, r.bed_number
  `, (err, assignments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(assignments);
  });
});

// Optimize room assignments
router.post('/optimize-rooms', authenticateToken, (req, res) => {
  db.all(`
    SELECT * FROM cadets 
    WHERE status = 'active' 
    ORDER BY behavior_score DESC, age
  `, (err, cadets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const roomSize = 2; // 2 cadets per room
    const optimizedRooms = [];
    const unassigned = [...cadets];
    let roomNumber = 1;
    
    while (unassigned.length >= 2) {
      let bestPair = null;
      let bestScore = -1;
      let bestIndices = [];
      
      // Find the best compatible pair
      for (let i = 0; i < unassigned.length - 1; i++) {
        for (let j = i + 1; j < unassigned.length; j++) {
          const score = calculateCompatibility(unassigned[i], unassigned[j]);
          if (score > bestScore) {
            bestScore = score;
            bestPair = [unassigned[i], unassigned[j]];
            bestIndices = [i, j];
          }
        }
      }
      
      if (bestPair) {
        optimizedRooms.push({
          room_number: roomNumber++,
          cadets: bestPair,
          compatibility_score: bestScore,
          recommendations: generateRecommendations(bestPair, bestScore)
        });
        
        // Remove assigned cadets (reverse order to maintain indices)
        unassigned.splice(bestIndices[1], 1);
        unassigned.splice(bestIndices[0], 1);
      } else {
        break;
      }
    }
    
    // Handle any remaining single cadet
    if (unassigned.length === 1) {
      optimizedRooms.push({
        room_number: roomNumber,
        cadets: [unassigned[0]],
        compatibility_score: null,
        recommendations: ['Single room assignment - monitor for isolation']
      });
    }
    
    res.json({
      optimized_rooms: optimizedRooms,
      total_rooms: optimizedRooms.length,
      average_compatibility: optimizedRooms
        .filter(room => room.compatibility_score)
        .reduce((sum, room) => sum + room.compatibility_score, 0) / 
        optimizedRooms.filter(room => room.compatibility_score).length
    });
  });
});

function generateRecommendations(cadets, score) {
  const recommendations = [];
  
  if (score >= 80) {
    recommendations.push('Excellent compatibility - encourage peer mentorship');
  } else if (score >= 60) {
    recommendations.push('Good compatibility - monitor for positive interactions');
  } else if (score >= 40) {
    recommendations.push('Moderate compatibility - provide structured activities');
  } else {
    recommendations.push('Low compatibility - increase supervision and mediation');
  }
  
  const behaviorDiff = Math.abs(cadets[0].behavior_score - cadets[1].behavior_score);
  if (behaviorDiff >= 2) {
    recommendations.push('Significant behavior score difference - pair mentoring opportunity');
  }
  
  return recommendations;
}

// Apply room assignments
router.post('/assign-rooms', authenticateToken, (req, res) => {
  const { assignments } = req.body;
  
  db.serialize(() => {
    db.run('DELETE FROM room_assignments');
    
    const stmt = db.prepare(`
      INSERT INTO room_assignments (cadet_id, room_number, bed_number)
      VALUES (?, ?, ?)
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
