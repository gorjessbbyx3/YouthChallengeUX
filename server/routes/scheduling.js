const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all scheduling tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('scheduling_tasks')
      .select(`
        *,
        staff_assignments (
          staff_id,
          staff (id, name, role)
        )
      `)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Format tasks with assigned staff
    const formattedTasks = tasks.map(task => ({
      ...task,
      assignedStaff: task.staff_assignments?.map(assignment => assignment.staff_id) || []
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create new scheduling task
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      requiredStaff,
      priority,
      category,
      assignedStaff
    } = req.body;

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('scheduling_tasks')
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        required_staff: requiredStaff,
        priority,
        category,
        created_by: req.user.id
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Assign staff to the task
    if (assignedStaff && assignedStaff.length > 0) {
      const assignments = assignedStaff.map(staffId => ({
        task_id: task.id,
        staff_id: staffId
      }));

      const { error: assignmentError } = await supabase
        .from('staff_assignments')
        .insert(assignments);

      if (assignmentError) throw assignmentError;
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get staff schedules
router.get('/schedules', authenticateToken, async (req, res) => {
  try {
    const { data: schedules, error } = await supabase
      .from('staff_assignments')
      .select(`
        *,
        staff (id, name, role, email),
        scheduling_tasks (*)
      `)
      .order('scheduling_tasks.start_time', { ascending: true });

    if (error) throw error;

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Suggest staff assignments based on availability
router.post('/suggest', authenticateToken, async (req, res) => {
  try {
    const { startTime, endTime, requiredStaff, category } = req.body;

    // Get all staff members
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('active', true);

    if (staffError) throw staffError;

    // Get conflicting assignments
    const { data: conflicts, error: conflictError } = await supabase
      .from('staff_assignments')
      .select(`
        staff_id,
        scheduling_tasks (start_time, end_time)
      `)
      .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

    if (conflictError) throw conflictError;

    // Filter available staff
    const conflictedStaffIds = new Set(conflicts.map(c => c.staff_id));
    const availableStaff = allStaff.filter(staff => !conflictedStaffIds.has(staff.id));

    // Prioritize staff based on role and category
    const rolePreferences = {
      hiset: ['instructor', 'teacher'],
      physical: ['fitness_instructor', 'drill_sergeant'],
      supervision: ['counselor', 'supervisor'],
      community: ['coordinator', 'supervisor'],
      counseling: ['counselor', 'psychologist'],
      admin: ['administrator', 'coordinator']
    };

    const preferredRoles = rolePreferences[category] || [];

    // Sort staff by preference and availability
    const sortedStaff = availableStaff.sort((a, b) => {
      const aPreferred = preferredRoles.includes(a.role);
      const bPreferred = preferredRoles.includes(b.role);

      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    });

    // Take the required number of staff
    const suggestedStaff = sortedStaff.slice(0, requiredStaff).map(staff => staff.id);

    res.json({ 
      suggestedStaff,
      availableCount: availableStaff.length,
      conflictCount: conflictedStaffIds.size
    });
  } catch (error) {
    console.error('Error suggesting staff:', error);
    res.status(500).json({ error: 'Failed to suggest staff assignments' });
  }
});

// Check for schedule conflicts
router.get('/conflicts', authenticateToken, async (req, res) => {
  try {
    const { data: assignments, error } = await supabase
      .from('staff_assignments')
      .select(`
        *,
        staff (id, name),
        scheduling_tasks (id, title, start_time, end_time)
      `);

    if (error) throw error;

    const conflicts = [];
    const staffSchedules = {};

    // Group assignments by staff
    assignments.forEach(assignment => {
      const staffId = assignment.staff_id;
      if (!staffSchedules[staffId]) {
        staffSchedules[staffId] = {
          staff: assignment.staff,
          tasks: []
        };
      }
      staffSchedules[staffId].tasks.push(assignment.scheduling_tasks);
    });

    // Check for overlapping tasks for each staff member
    Object.values(staffSchedules).forEach(schedule => {
      const tasks = schedule.tasks.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      for (let i = 0; i < tasks.length - 1; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
          const task1 = tasks[i];
          const task2 = tasks[j];

          const start1 = new Date(task1.start_time);
          const end1 = new Date(task1.end_time);
          const start2 = new Date(task2.start_time);
          const end2 = new Date(task2.end_time);

          // Check for overlap
          if (start1 < end2 && start2 < end1) {
            conflicts.push({
              staffId: schedule.staff.id,
              staffName: schedule.staff.name,
              task1: task1.title,
              task2: task2.title,
              date: start1,
              type: 'overlap'
            });
          }
        }
      }
    });

    res.json(conflicts);
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Send task notifications
router.post('/notifications', authenticateToken, async (req, res) => {
  try {
    const { taskId, assignedStaff, taskDetails } = req.body;

    // Get staff email addresses
    const { data: staff, error } = await supabase
      .from('staff')
      .select('email, name')
      .in('id', assignedStaff);

    if (error) throw error;

    // Send emails to assigned staff
    const emailPromises = staff.map(member => {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: member.email,
        subject: `New Assignment: ${taskDetails.title}`,
        html: `
          <h2>New Task Assignment</h2>
          <p>Dear ${member.name},</p>
          <p>You have been assigned to a new task:</p>
          <ul>
            <li><strong>Task:</strong> ${taskDetails.title}</li>
            <li><strong>Category:</strong> ${taskDetails.category}</li>
            <li><strong>Start Time:</strong> ${new Date(taskDetails.startTime).toLocaleString()}</li>
            <li><strong>End Time:</strong> ${new Date(taskDetails.endTime).toLocaleString()}</li>
            <li><strong>Priority:</strong> ${taskDetails.priority}</li>
          </ul>
          ${taskDetails.description ? `<p><strong>Description:</strong> ${taskDetails.description}</p>` : ''}
          <p>Please confirm your availability and prepare accordingly.</p>
          <p>Thank you,<br>YCA CRM System</p>
        `
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    res.json({ message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Schedule automatic reminders
cron.schedule('0 8 * * *', async () => {
  console.log('Sending daily schedule reminders...');

  try {
    // Get today's assignments
    const today = new Date().toISOString().split('T')[0];

    const { data: todayAssignments, error } = await supabase
      .from('staff_assignments')
      .select(`
        *,
        staff (email, name),
        scheduling_tasks (title, start_time, end_time, category)
      `)
      .gte('scheduling_tasks.start_time', `${today}T00:00:00`)
      .lt('scheduling_tasks.start_time', `${today}T23:59:59`);

    if (error) throw error;

    // Group by staff and send reminders
    const staffReminders = {};
    todayAssignments.forEach(assignment => {
      const staffId = assignment.staff_id;
      if (!staffReminders[staffId]) {
        staffReminders[staffId] = {
          staff: assignment.staff,
          tasks: []
        };
      }
      staffReminders[staffId].tasks.push(assignment.scheduling_tasks);
    });

    // Send reminder emails
    for (const [staffId, reminder] of Object.entries(staffReminders)) {
      const tasksHtml = reminder.tasks.map(task => `
        <li>
          <strong>${task.title}</strong><br>
          Time: ${new Date(task.start_time).toLocaleTimeString()} - ${new Date(task.end_time).toLocaleTimeString()}<br>
          Category: ${task.category}
        </li>
      `).join('');

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: reminder.staff.email,
        subject: 'Daily Schedule Reminder - YCA',
        html: `
          <h2>Your Schedule for Today</h2>
          <p>Dear ${reminder.staff.name},</p>
          <p>Here are your assignments for today:</p>
          <ul>${tasksHtml}</ul>
          <p>Have a great day!</p>
          <p>YCA CRM System</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    console.log('Daily reminders sent successfully');
  } catch (error) {
    console.error('Error sending daily reminders:', error);
  }
});

module.exports = router;