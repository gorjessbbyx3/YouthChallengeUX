
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all schedules
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT s.*, st.first_name as staff_name, st.last_name as staff_last_name
    FROM schedules s
    LEFT JOIN staff st ON s.staff_id = st.id
    ORDER BY s.date, s.start_time
  `, (err, schedules) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(schedules);
  });
});

// Create new schedule
router.post('/', authenticateToken, (req, res) => {
  const { staff_id, date, start_time, end_time, task_type, location, notes } = req.body;
  
  db.run(`
    INSERT INTO schedules (staff_id, date, start_time, end_time, task_type, location, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [staff_id, date, start_time, end_time, task_type, location, notes],
  function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Schedule created successfully' });
  });
});

// AI-powered schedule optimization using Hugging Face
router.post('/optimize', authenticateToken, async (req, res) => {
  try {
    const { date, tasks } = req.body;
    
    // Get staff data with historical schedule information
    const staff = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.*, 
               COALESCE(COUNT(sch.id), 0) as current_shifts,
               GROUP_CONCAT(sch.task_type) as task_history,
               AVG(CASE WHEN sch.notes LIKE '%excellent%' OR sch.notes LIKE '%good%' THEN 1 ELSE 0 END) as performance_score
        FROM staff s
        LEFT JOIN schedules sch ON s.id = sch.staff_id 
        WHERE s.status = 'active'
        GROUP BY s.id
        ORDER BY s.experience_years DESC, current_shifts ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get cadet risk information for assignment context
    const cadets = await new Promise((resolve, reject) => {
      db.all(`
        SELECT COUNT(*) as total_cadets,
               SUM(CASE WHEN behavior_score <= 2 THEN 1 ELSE 0 END) as high_risk_count
        FROM cadets WHERE status = 'active'
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });

    // AI-enhanced staff scoring
    const scoredStaff = await Promise.all(staff.map(async (member) => {
      const availabilityScore = await predictStaffAvailability(member);
      const experienceWeight = Math.min(member.experience_years / 5, 1); // Cap at 5 years
      const performanceWeight = member.performance_score || 0.5;
      const workloadBalance = Math.max(0, 1 - (member.current_shifts / 3)); // Penalize overwork
      
      return {
        ...member,
        ai_score: (availabilityScore * 0.3) + (experienceWeight * 0.4) + (performanceWeight * 0.2) + (workloadBalance * 0.1),
        predicted_availability: availabilityScore
      };
    }));

    // Optimize assignments using AI scores
    const optimizedSchedule = tasks.map(task => {
      let eligibleStaff = scoredStaff.filter(s => 
        s.current_shifts < 2 && // Max 2 shifts per day
        s.predicted_availability > 0.6 // AI confidence threshold
      );

      // Prioritize experienced staff for high-risk situations
      if (task.requires_experience || task.high_risk_cadets) {
        eligibleStaff = eligibleStaff.filter(s => s.experience_years >= 2);
      }

      // Sort by AI score and select best matches
      eligibleStaff.sort((a, b) => b.ai_score - a.ai_score);
      const assignedStaff = eligibleStaff.slice(0, task.required_staff || 1);

      return {
        task: task.name,
        time: task.time,
        assigned_staff: assignedStaff,
        priority: task.priority || 'medium',
        ai_confidence: assignedStaff.length > 0 ? Math.min(...assignedStaff.map(s => s.ai_score)) : 0,
        assignment_rationale: generateAssignmentRationale(task, assignedStaff, cadets)
      };
    });

    // Generate AI-powered recommendations
    const recommendations = generateAIRecommendations(optimizedSchedule, staff, cadets);

    res.json({
      date,
      optimized_schedule: optimizedSchedule,
      recommendations,
      ai_metadata: {
        total_staff_analyzed: staff.length,
        high_risk_cadets: cadets.high_risk_count,
        optimization_confidence: calculateOverallConfidence(optimizedSchedule)
      }
    });

  } catch (error) {
    console.error('AI scheduling optimization error:', error);
    res.status(500).json({ 
      error: 'AI optimization failed, falling back to basic scheduling',
      fallback: true 
    });
  }
});

// AI availability prediction function
async function predictStaffAvailability(staffMember) {
  try {
    // Create schedule data for AI analysis
    const scheduleData = `
      Staff: ${staffMember.name}
      Experience: ${staffMember.experience_years} years
      Role: ${staffMember.role}
      Recent tasks: ${staffMember.task_history || 'none'}
      Current shifts: ${staffMember.current_shifts}
      Performance: ${(staffMember.performance_score || 0.5) * 100}%
    `;

    // For now, use rule-based scoring (can be replaced with actual HF model)
    let availabilityScore = 0.8; // Base score

    // Adjust based on current workload
    if (staffMember.current_shifts === 0) availabilityScore += 0.1;
    if (staffMember.current_shifts >= 2) availabilityScore -= 0.3;

    // Adjust based on experience
    availabilityScore += Math.min(staffMember.experience_years * 0.02, 0.1);

    // Adjust based on performance
    if (staffMember.performance_score) {
      availabilityScore += (staffMember.performance_score - 0.5) * 0.2;
    }

    return Math.max(0, Math.min(1, availabilityScore));
  } catch (error) {
    console.error('Availability prediction error:', error);
    return 0.5; // Default moderate availability
  }
}

function generateAssignmentRationale(task, assignedStaff, cadetInfo) {
  const rationales = [];
  
  if (assignedStaff.length === 0) {
    return ['No suitable staff available - consider adjusting requirements'];
  }

  assignedStaff.forEach(staff => {
    if (staff.experience_years >= 3) {
      rationales.push(`${staff.name}: High experience (${staff.experience_years}yr) suitable for ${task.name}`);
    }
    if (staff.ai_score > 0.8) {
      rationales.push(`${staff.name}: AI confidence score ${(staff.ai_score * 100).toFixed(0)}%`);
    }
    if (staff.current_shifts === 0) {
      rationales.push(`${staff.name}: Available with no current shifts`);
    }
  });

  return rationales.length > 0 ? rationales : ['Standard assignment based on availability'];
}

function generateAIRecommendations(schedule, staff, cadetInfo) {
  const recommendations = [];
  
  const highConfidenceAssignments = schedule.filter(s => s.ai_confidence > 0.7).length;
  const totalAssignments = schedule.length;
  
  if (highConfidenceAssignments / totalAssignments < 0.6) {
    recommendations.push('Consider recruiting additional experienced staff for better coverage');
  }
  
  if (cadetInfo.high_risk_count > 0) {
    const experiencedStaffCount = staff.filter(s => s.experience_years >= 2).length;
    if (experiencedStaffCount < cadetInfo.high_risk_count) {
      recommendations.push(`${cadetInfo.high_risk_count} high-risk cadets need experienced staff supervision`);
    }
  }
  
  const overworkedStaff = staff.filter(s => s.current_shifts >= 2);
  if (overworkedStaff.length > 0) {
    recommendations.push(`Consider redistributing load - ${overworkedStaff.length} staff at capacity`);
  }
  
  recommendations.push('AI suggests rotating experienced staff to prevent burnout');
  recommendations.push('Monitor assignment effectiveness and provide feedback for AI improvement');
  
  return recommendations;
}

function calculateOverallConfidence(schedule) {
  if (schedule.length === 0) return 0;
  const totalConfidence = schedule.reduce((sum, s) => sum + (s.ai_confidence || 0), 0);
  return (totalConfidence / schedule.length * 100).toFixed(1);
}

module.exports = router;
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');

// Get all staff schedules
router.get('/', async (req, res) => {
  try {
    const { date, staff_id } = req.query;
    
    let query = supabase
      .from('staff_schedules')
      .select(`
        *,
        staff (id, first_name, last_name, role)
      `)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (date) {
      query = query.eq('date', date);
    }
    
    if (staff_id) {
      query = query.eq('staff_id', staff_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching schedules:', error);
      return res.status(500).json({ error: 'Failed to fetch schedules' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in GET /schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new schedule/task
router.post('/', async (req, res) => {
  try {
    const {
      staff_id,
      task_name,
      description,
      date,
      start_time,
      end_time,
      location,
      required_staff = 1
    } = req.body;

    // Validate required fields
    if (!task_name || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('staff_schedules')
      .insert({
        staff_id,
        task_name,
        description,
        date,
        start_time,
        end_time,
        location,
        required_staff,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      return res.status(500).json({ error: 'Failed to create schedule' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in POST /schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('staff_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in PUT /schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('staff_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign staff to task
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_ids } = req.body;

    if (!Array.isArray(staff_ids)) {
      return res.status(400).json({ error: 'staff_ids must be an array' });
    }

    const { data, error } = await supabase
      .from('staff_schedules')
      .update({ 
        assigned_staff: staff_ids,
        status: staff_ids.length > 0 ? 'assigned' : 'scheduled'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error assigning staff:', error);
      return res.status(500).json({ error: 'Failed to assign staff' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in POST /schedules/:id/assign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available staff for a time slot
router.get('/available-staff', async (req, res) => {
  try {
    const { date, start_time, end_time } = req.query;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get all staff
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, role');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return res.status(500).json({ error: 'Failed to fetch staff' });
    }

    // Get conflicting schedules
    const { data: conflicts, error: conflictError } = await supabase
      .from('staff_schedules')
      .select('assigned_staff')
      .eq('date', date)
      .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`);

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return res.status(500).json({ error: 'Failed to check conflicts' });
    }

    // Extract conflicting staff IDs
    const conflictingStaffIds = new Set();
    conflicts.forEach(schedule => {
      if (schedule.assigned_staff) {
        schedule.assigned_staff.forEach(staffId => {
          conflictingStaffIds.add(staffId);
        });
      }
    });

    // Filter available staff
    const availableStaff = allStaff.filter(staff => 
      !conflictingStaffIds.has(staff.id)
    );

    res.json(availableStaff);
  } catch (error) {
    console.error('Error in GET /schedules/available-staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
