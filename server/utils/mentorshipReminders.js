
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { supabase } = require('../database/supabase');

// Configure email transporter (you'll need to set up your email service)
const transporter = nodemailer.createTransporter({
  // Configure with your email service (Gmail, SendGrid, etc.)
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send reminder email
const sendReminderEmail = async (mentor, cadet, sessionDate) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
    to: mentor.email,
    subject: `Mentorship Session Reminder - ${cadet.first_name} ${cadet.last_name}`,
    html: `
      <h3>Mentorship Session Reminder</h3>
      <p>Dear ${mentor.first_name},</p>
      <p>This is a reminder that you have a mentorship session scheduled:</p>
      <ul>
        <li><strong>Cadet:</strong> ${cadet.first_name} ${cadet.last_name}</li>
        <li><strong>Date:</strong> ${new Date(sessionDate).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${new Date(sessionDate).toLocaleTimeString()}</li>
      </ul>
      <p>Please prepare any materials and review the cadet's previous session notes.</p>
      <p>Remember to log the session details after the meeting in the CRM system.</p>
      <p>Best regards,<br>YCA CRM System</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder sent to ${mentor.email} for session with ${cadet.first_name}`);
  } catch (error) {
    console.error('Error sending reminder email:', error);
  }
};

// Check for upcoming sessions and send reminders
const checkUpcomingSessions = async () => {
  try {
    // Get sessions scheduled for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: upcomingSessions, error } = await supabase
      .from('mentorship_logs')
      .select(`
        *,
        cadets (id, first_name, last_name, email),
        staff (id, first_name, last_name, email)
      `)
      .eq('session_date', tomorrowStr)
      .eq('reminder_sent', false);

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      return;
    }

    for (const session of upcomingSessions) {
      if (session.cadets && session.staff) {
        await sendReminderEmail(session.staff, session.cadets, session.session_date);
        
        // Mark reminder as sent
        await supabase
          .from('mentorship_logs')
          .update({ reminder_sent: true })
          .eq('id', session.id);
      }
    }
  } catch (error) {
    console.error('Error in checkUpcomingSessions:', error);
  }
};

// Schedule daily reminder check at 9 AM
const initializeReminderSchedule = () => {
  cron.schedule('0 9 * * *', () => {
    console.log('Running daily mentorship reminder check...');
    checkUpcomingSessions();
  });
  
  console.log('Mentorship reminder scheduler initialized');
};

module.exports = {
  initializeReminderSchedule,
  checkUpcomingSessions,
  sendReminderEmail
};
