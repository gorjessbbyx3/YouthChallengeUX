
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { supabase } = require('../database/supabase');

// Configure email transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send schedule reminder email
const sendScheduleReminder = async (staffMember, schedule) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
    to: staffMember.email,
    subject: `Schedule Reminder: ${schedule.task_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196f3;">YCA Schedule Reminder</h2>
        <p>Dear ${staffMember.first_name},</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Upcoming Assignment</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Task:</td>
              <td style="padding: 8px 0;">${schedule.task_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0;">${new Date(schedule.date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Time:</td>
              <td style="padding: 8px 0;">${schedule.start_time} - ${schedule.end_time}</td>
            </tr>
            ${schedule.location ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0;">${schedule.location}</td>
            </tr>
            ` : ''}
            ${schedule.description ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Description:</td>
              <td style="padding: 8px 0;">${schedule.description}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p>Please ensure you're prepared and arrive on time. If you need to make any changes, please contact your supervisor immediately.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            This is an automated reminder from the YCA CRM System.<br>
            For questions or issues, please contact your program administrator.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Schedule reminder sent to ${staffMember.email} for ${schedule.task_name}`);
  } catch (error) {
    console.error('Error sending schedule reminder:', error);
  }
};

// Send weekly schedule summary
const sendWeeklyScheduleSummary = async (staffMember, weeklySchedules) => {
  if (weeklySchedules.length === 0) return;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
    to: staffMember.email,
    subject: 'Weekly Schedule Summary - YCA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196f3;">Weekly Schedule Summary</h2>
        <p>Dear ${staffMember.first_name},</p>
        
        <p>Here's your schedule for the upcoming week:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${weeklySchedules.map(schedule => `
            <div style="border-bottom: 1px solid #ddd; padding: 15px 0;">
              <h4 style="margin: 0 0 8px 0; color: #333;">${schedule.task_name}</h4>
              <p style="margin: 0; color: #666;">
                <strong>${new Date(schedule.date).toLocaleDateString()}</strong> • 
                ${schedule.start_time} - ${schedule.end_time}
                ${schedule.location ? ` • ${schedule.location}` : ''}
              </p>
              ${schedule.description ? `<p style="margin: 8px 0 0 0; font-size: 14px;">${schedule.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
        
        <p>Thank you for your dedication to the Youth ChalleNGe Academy program.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Weekly schedule summary from the YCA CRM System.<br>
            Daily reminders will be sent 24 hours before each assignment.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Weekly schedule summary sent to ${staffMember.email}`);
  } catch (error) {
    console.error('Error sending weekly schedule summary:', error);
  }
};

// Check for upcoming schedules and send daily reminders
const checkDailyReminders = async () => {
  try {
    // Get schedules for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: upcomingSchedules, error } = await supabase
      .from('staff_schedules')
      .select(`
        *,
        staff (id, first_name, last_name, email)
      `)
      .eq('date', tomorrowStr)
      .not('assigned_staff', 'is', null);

    if (error) {
      console.error('Error fetching upcoming schedules:', error);
      return;
    }

    for (const schedule of upcomingSchedules) {
      if (schedule.assigned_staff && schedule.assigned_staff.length > 0) {
        // Get staff details for assigned staff
        const { data: assignedStaff, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, email')
          .in('id', schedule.assigned_staff);

        if (staffError) {
          console.error('Error fetching assigned staff:', staffError);
          continue;
        }

        // Send reminder to each assigned staff member
        for (const staffMember of assignedStaff) {
          if (staffMember.email) {
            await sendScheduleReminder(staffMember, schedule);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in checkDailyReminders:', error);
  }
};

// Send weekly schedule summaries
const sendWeeklyReminders = async () => {
  try {
    // Get next week's schedules
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const weekStart = new Date(nextWeek);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week

    const { data: weeklySchedules, error } = await supabase
      .from('staff_schedules')
      .select(`
        *,
        staff (id, first_name, last_name, email)
      `)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .not('assigned_staff', 'is', null)
      .order('date')
      .order('start_time');

    if (error) {
      console.error('Error fetching weekly schedules:', error);
      return;
    }

    // Group schedules by staff member
    const staffSchedules = {};
    
    for (const schedule of weeklySchedules) {
      if (schedule.assigned_staff && schedule.assigned_staff.length > 0) {
        const { data: assignedStaff, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, email')
          .in('id', schedule.assigned_staff);

        if (staffError) continue;

        for (const staffMember of assignedStaff) {
          if (!staffSchedules[staffMember.id]) {
            staffSchedules[staffMember.id] = {
              staff: staffMember,
              schedules: []
            };
          }
          staffSchedules[staffMember.id].schedules.push(schedule);
        }
      }
    }

    // Send weekly summary to each staff member
    for (const staffData of Object.values(staffSchedules)) {
      if (staffData.staff.email && staffData.schedules.length > 0) {
        await sendWeeklyScheduleSummary(staffData.staff, staffData.schedules);
      }
    }
  } catch (error) {
    console.error('Error in sendWeeklyReminders:', error);
  }
};

// Initialize reminder schedules
const initializeSchedulingReminders = () => {
  // Daily reminders at 6 PM for next day's schedule
  cron.schedule('0 18 * * *', () => {
    console.log('Running daily schedule reminder check...');
    checkDailyReminders();
  });

  // Weekly summaries on Sunday at 7 PM for the upcoming week
  cron.schedule('0 19 * * 0', () => {
    console.log('Sending weekly schedule summaries...');
    sendWeeklyReminders();
  });

  console.log('Schedule reminder system initialized');
};

module.exports = {
  initializeSchedulingReminders,
  checkDailyReminders,
  sendWeeklyReminders,
  sendScheduleReminder
};
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { supabase } = require('../database/supabase');

// Configure email transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send weekly schedule summary every Sunday at 6 PM
const initializeWeeklyScheduleSummary = () => {
  cron.schedule('0 18 * * 0', async () => {
    console.log('Sending weekly schedule summary...');
    
    try {
      const nextWeekStart = new Date();
      nextWeekStart.setDate(nextWeekStart.getDate() + 1); // Monday
      nextWeekStart.setHours(0, 0, 0, 0);
      
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6); // Sunday
      nextWeekEnd.setHours(23, 59, 59, 999);

      // Get all staff
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email')
        .eq('active', true);

      if (staffError) throw staffError;

      // Get next week's assignments for each staff member
      for (const member of staff) {
        const { data: assignments, error: assignmentError } = await supabase
          .from('staff_assignments')
          .select(`
            *,
            scheduling_tasks (title, start_time, end_time, category, priority, description)
          `)
          .eq('staff_id', member.id)
          .gte('scheduling_tasks.start_time', nextWeekStart.toISOString())
          .lte('scheduling_tasks.start_time', nextWeekEnd.toISOString())
          .order('scheduling_tasks.start_time', { ascending: true });

        if (assignmentError) throw assignmentError;

        if (assignments.length > 0) {
          // Group tasks by day
          const tasksByDay = {};
          assignments.forEach(assignment => {
            const task = assignment.scheduling_tasks;
            const day = new Date(task.start_time).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            });
            
            if (!tasksByDay[day]) {
              tasksByDay[day] = [];
            }
            tasksByDay[day].push(task);
          });

          // Generate HTML content
          let scheduleHtml = '';
          Object.entries(tasksByDay).forEach(([day, tasks]) => {
            scheduleHtml += `<h3>${day}</h3><ul>`;
            tasks.forEach(task => {
              const startTime = new Date(task.start_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });
              const endTime = new Date(task.end_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              scheduleHtml += `
                <li>
                  <strong>${task.title}</strong><br>
                  Time: ${startTime} - ${endTime}<br>
                  Category: ${task.category}<br>
                  Priority: ${task.priority}
                  ${task.description ? `<br>Notes: ${task.description}` : ''}
                </li>
              `;
            });
            scheduleHtml += '</ul>';
          });

          const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: member.email,
            subject: 'Weekly Schedule Summary - YCA',
            html: `
              <h2>Your Schedule for Next Week</h2>
              <p>Dear ${member.name},</p>
              <p>Here's your schedule for the upcoming week:</p>
              ${scheduleHtml}
              <p>Please review your assignments and contact your supervisor if you have any conflicts or questions.</p>
              <p>Thank you for your dedicated service to our cadets.</p>
              <p>Best regards,<br>YCA CRM System</p>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log(`Weekly summary sent to ${member.name}`);
        }
      }

      console.log('Weekly schedule summaries sent successfully');
    } catch (error) {
      console.error('Error sending weekly summaries:', error);
    }
  });
};

// Send reminder for tasks starting in 2 hours
const initializeImmediateReminders = () => {
  cron.schedule('*/30 * * * *', async () => { // Every 30 minutes
    try {
      const twoHoursFromNow = new Date();
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);
      
      const twoHoursThirtyFromNow = new Date();
      twoHoursThirtyFromNow.setHours(twoHoursThirtyFromNow.getHours() + 2.5);

      // Get tasks starting in approximately 2 hours
      const { data: upcomingTasks, error } = await supabase
        .from('staff_assignments')
        .select(`
          *,
          staff (name, email),
          scheduling_tasks (title, start_time, end_time, category, description)
        `)
        .gte('scheduling_tasks.start_time', twoHoursFromNow.toISOString())
        .lt('scheduling_tasks.start_time', twoHoursThirtyFromNow.toISOString());

      if (error) throw error;

      for (const assignment of upcomingTasks) {
        const task = assignment.scheduling_tasks;
        const staff = assignment.staff;
        
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from('scheduling_notifications')
          .select('id')
          .eq('task_id', assignment.task_id)
          .eq('staff_id', assignment.staff_id)
          .eq('notification_type', 'reminder')
          .single();

        if (!existingReminder) {
          const startTime = new Date(task.start_time).toLocaleString();
          
          const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: staff.email,
            subject: `Upcoming Assignment Reminder - ${task.title}`,
            html: `
              <h2>Assignment Reminder</h2>
              <p>Dear ${staff.name},</p>
              <p>This is a reminder that you have an upcoming assignment:</p>
              <ul>
                <li><strong>Task:</strong> ${task.title}</li>
                <li><strong>Start Time:</strong> ${startTime}</li>
                <li><strong>Category:</strong> ${task.category}</li>
                ${task.description ? `<li><strong>Notes:</strong> ${task.description}</li>` : ''}
              </ul>
              <p>Please ensure you are prepared and arrive on time.</p>
              <p>Thank you,<br>YCA CRM System</p>
            `
          };

          await transporter.sendMail(mailOptions);

          // Log the notification
          await supabase
            .from('scheduling_notifications')
            .insert({
              task_id: assignment.task_id,
              staff_id: assignment.staff_id,
              notification_type: 'reminder',
              status: 'sent',
              message_content: `Reminder sent for ${task.title} starting at ${startTime}`
            });

          console.log(`Reminder sent to ${staff.name} for ${task.title}`);
        }
      }
    } catch (error) {
      console.error('Error sending immediate reminders:', error);
    }
  });
};

// Check for understaffed tasks and alert supervisors
const initializeUnderstaffingAlerts = () => {
  cron.schedule('0 */6 * * *', async () => { // Every 6 hours
    try {
      // Get tasks in the next 7 days that are understaffed
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: tasks, error } = await supabase
        .from('scheduling_tasks')
        .select(`
          *,
          staff_assignments (staff_id)
        `)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', sevenDaysFromNow.toISOString());

      if (error) throw error;

      const understaffedTasks = tasks.filter(task => {
        const assignedCount = task.staff_assignments?.length || 0;
        return assignedCount < task.required_staff;
      });

      if (understaffedTasks.length > 0) {
        // Get supervisors (staff with admin/supervisor roles)
        const { data: supervisors, error: supervisorError } = await supabase
          .from('staff')
          .select('email, name')
          .in('role', ['administrator', 'supervisor', 'coordinator'])
          .eq('active', true);

        if (supervisorError) throw supervisorError;

        const alertHtml = understaffedTasks.map(task => {
          const assignedCount = task.staff_assignments?.length || 0;
          const shortage = task.required_staff - assignedCount;
          const startTime = new Date(task.start_time).toLocaleString();
          
          return `
            <li>
              <strong>${task.title}</strong><br>
              Start Time: ${startTime}<br>
              Category: ${task.category}<br>
              Staff Needed: ${task.required_staff}<br>
              Currently Assigned: ${assignedCount}<br>
              <span style="color: red;">Shortage: ${shortage} staff member(s)</span>
            </li>
          `;
        }).join('');

        for (const supervisor of supervisors) {
          const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: supervisor.email,
            subject: `Staffing Alert - ${understaffedTasks.length} Understaffed Task(s)`,
            html: `
              <h2>Staffing Alert</h2>
              <p>Dear ${supervisor.name},</p>
              <p>The following tasks in the next 7 days are currently understaffed:</p>
              <ul>${alertHtml}</ul>
              <p>Please review these assignments and ensure adequate staffing.</p>
              <p>You can view and manage assignments in the YCA CRM Scheduling module.</p>
              <p>Best regards,<br>YCA CRM System</p>
            `
          };

          await transporter.sendMail(mailOptions);
        }

        console.log(`Understaffing alert sent for ${understaffedTasks.length} tasks`);
      }
    } catch (error) {
      console.error('Error checking understaffing:', error);
    }
  });
};

// Initialize all reminder systems
const initializeSchedulingReminders = () => {
  console.log('Initializing scheduling reminder system...');
  initializeWeeklyScheduleSummary();
  initializeImmediateReminders();
  initializeUnderstaffingAlerts();
  console.log('Scheduling reminders active');
};

module.exports = {
  initializeSchedulingReminders,
  initializeWeeklyScheduleSummary,
  initializeImmediateReminders,
  initializeUnderstaffingAlerts
};
