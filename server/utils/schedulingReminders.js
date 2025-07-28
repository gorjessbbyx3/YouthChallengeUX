
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
