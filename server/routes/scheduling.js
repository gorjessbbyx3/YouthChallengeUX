
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

// AI-powered schedule optimization
router.post('/optimize', authenticateToken, (req, res) => {
  const { date, tasks } = req.body;
  
  // Get available staff for the date
  db.all(`
    SELECT s.*, 
           COALESCE(COUNT(sch.id), 0) as current_shifts
    FROM staff s
    LEFT JOIN schedules sch ON s.id = sch.staff_id AND sch.date = ?
    WHERE s.status = 'active'
    GROUP BY s.id
    ORDER BY s.experience_years DESC, current_shifts ASC
  `, [date], (err, staff) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Simple optimization algorithm
    const optimizedSchedule = tasks.map(task => {
      const availableStaff = staff.filter(s => 
        s.current_shifts < 2 && // Max 2 shifts per day
        (task.requires_experience ? s.experience_years >= 2 : true)
      );
      
      return {
        task: task.name,
        time: task.time,
        assigned_staff: availableStaff.slice(0, task.required_staff || 1),
        priority: task.priority || 'medium'
      };
    });
    
    res.json({
      date,
      optimized_schedule: optimizedSchedule,
      recommendations: [
        'Consider rotating high-experience staff across shifts',
        'Ensure backup coverage for critical tasks',
        'Balance workload to prevent staff burnout'
      ]
    });
  });
});

module.exports = router;
