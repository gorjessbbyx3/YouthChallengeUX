
const cron = require('node-cron');
const { supabase } = require('../database/supabase');
const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Schedule daily reminder checks at 8 AM
const scheduleEventReminders = () => {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily event reminder check...');
    await sendDailyEventReminders();
  });

  // Run every Monday at 9:00 AM for weekly reminders
  cron.schedule('0 9 * * 1', async () => {
    console.log('Running weekly event reminder check...');
    await sendWeeklyEventReminders();
  });

  console.log('Event reminder scheduler initialized');
};

// Send reminders for events happening today and tomorrow
const sendDailyEventReminders = async () => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        event_staff_assignments(
          staff_id,
          staff(name, email)
        ),
        event_cadet_assignments(
          cadet_id,
          cadets(name, email)
        )
      `)
      .gte('start_date', todayStart.toISOString())
      .lte('start_date', tomorrowEnd.toISOString())
      .eq('status', 'scheduled');

    if (error) {
      console.error('Error fetching events for reminders:', error);
      return;
    }

    let remindersSent = 0;
    for (const event of events) {
      const eventDate = new Date(event.start_date);
      const isToday = eventDate.toDateString() === today.toDateString();
      const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();

      if (isToday || isTomorrow) {
        await sendEventReminder(event, isToday ? 'today' : 'tomorrow');
        remindersSent++;
      }
    }

    console.log(`Sent ${remindersSent} event reminders`);
  } catch (error) {
    console.error('Error in sendDailyEventReminders:', error);
  }
};

// Send weekly summary of upcoming events
const sendWeeklyEventReminders = async () => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        event_staff_assignments(
          staff_id,
          staff(name, email)
        ),
        event_cadet_assignments(
          cadet_id,
          cadets(name, email)
        )
      `)
      .gte('start_date', today.toISOString())
      .lte('start_date', nextWeek.toISOString())
      .eq('status', 'scheduled')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching weekly events:', error);
      return;
    }

    if (events.length === 0) {
      console.log('No events scheduled for the upcoming week');
      return;
    }

    // Group events by participants
    const participantEvents = new Map();

    events.forEach(event => {
      // Add staff
      event.event_staff_assignments?.forEach(assignment => {
        if (assignment.staff?.email) {
          if (!participantEvents.has(assignment.staff.email)) {
            participantEvents.set(assignment.staff.email, {
              name: assignment.staff.name,
              email: assignment.staff.email,
              events: []
            });
          }
          participantEvents.get(assignment.staff.email).events.push(event);
        }
      });

      // Add cadets
      event.event_cadet_assignments?.forEach(assignment => {
        if (assignment.cadets?.email) {
          if (!participantEvents.has(assignment.cadets.email)) {
            participantEvents.set(assignment.cadets.email, {
              name: assignment.cadets.name,
              email: assignment.cadets.email,
              events: []
            });
          }
          participantEvents.get(assignment.cadets.email).events.push(event);
        }
      });
    });

    // Send weekly summary to each participant
    let summariesSent = 0;
    for (const [email, participant] of participantEvents) {
      await sendWeeklySummary(participant);
      summariesSent++;
    }

    console.log(`Sent ${summariesSent} weekly event summaries`);
  } catch (error) {
    console.error('Error in sendWeeklyEventReminders:', error);
  }
};

// Send individual event reminder
const sendEventReminder = async (event, timeframe) => {
  try {
    const eventDate = new Date(event.start_date);
    const eventTime = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    const subject = `Event Reminder: ${event.title} ${timeframe}`;
    
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Event Reminder: ${event.title}</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📅 When:</strong> ${timeframe === 'today' ? 'Today' : 'Tomorrow'} at ${eventTime}</p>
          <p><strong>📍 Where:</strong> ${event.location || 'Location TBD'}</p>
          <p><strong>🏷️ Type:</strong> ${event.event_type.replace('_', ' ').toUpperCase()}</p>
          ${event.description ? `<p><strong>📝 Description:</strong> ${event.description}</p>` : ''}
          ${event.community_service_hours ? `<p><strong>⏱️ Service Hours:</strong> ${event.community_service_hours} hours</p>` : ''}
        </div>
        <p style="color: #7f8c8d;">Please make sure to arrive on time and bring any necessary materials.</p>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
        <p style="font-size: 12px; color: #95a5a6;">This is an automated reminder from the YCA CRM system.</p>
      </div>
    `;

    // Collect all recipient emails
    const staffEmails = event.event_staff_assignments
      ?.map(a => a.staff?.email)
      .filter(email => email) || [];

    const cadetEmails = event.event_cadet_assignments
      ?.map(a => a.cadets?.email)
      .filter(email => email) || [];

    const allEmails = [...staffEmails, ...cadetEmails];

    if (allEmails.length > 0) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
        to: allEmails.join(','),
        subject,
        html: message
      });

      // Log the reminder
      await supabase
        .from('event_reminders')
        .insert([{
          event_id: event.id,
          reminder_type: `daily_${timeframe}`,
          sent_to: JSON.stringify(allEmails),
          status: 'sent'
        }]);
    }
  } catch (error) {
    console.error('Error sending event reminder:', error);
    
    // Log failed reminder
    await supabase
      .from('event_reminders')
      .insert([{
        event_id: event.id,
        reminder_type: `daily_${timeframe}`,
        sent_to: JSON.stringify([]),
        status: 'failed'
      }]);
  }
};

// Send weekly summary to a participant
const sendWeeklySummary = async (participant) => {
  try {
    const subject = `Weekly Event Schedule - ${participant.name}`;
    
    const eventsList = participant.events.map(event => {
      const eventDate = new Date(event.start_date);
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
      const date = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      return `
        <div style="border-left: 4px solid #3498db; padding-left: 15px; margin: 15px 0;">
          <h4 style="margin: 0; color: #2c3e50;">${event.title}</h4>
          <p style="margin: 5px 0; color: #7f8c8d;">
            ${dayName}, ${date} at ${time}<br>
            📍 ${event.location || 'Location TBD'}<br>
            🏷️ ${event.event_type.replace('_', ' ').toUpperCase()}
            ${event.community_service_hours ? `<br>⏱️ ${event.community_service_hours} service hours` : ''}
          </p>
        </div>
      `;
    }).join('');

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Your Events This Week</h2>
        <p>Hi ${participant.name},</p>
        <p>Here are your scheduled events for the upcoming week:</p>
        
        ${eventsList}
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>📊 Week Summary:</strong></p>
          <p style="margin: 5px 0;">• Total Events: ${participant.events.length}</p>
          <p style="margin: 5px 0;">• Community Service Hours: ${participant.events.reduce((sum, e) => sum + (e.community_service_hours || 0), 0)}</p>
        </div>
        
        <p style="color: #7f8c8d;">Stay engaged and make a difference in your community!</p>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
        <p style="font-size: 12px; color: #95a5a6;">This is an automated weekly summary from the YCA CRM system.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
      to: participant.email,
      subject,
      html: message
    });

  } catch (error) {
    console.error('Error sending weekly summary:', error);
  }
};

// Manual trigger for sending reminders (for testing or manual execution)
const sendManualEventReminders = async () => {
  await sendDailyEventReminders();
  return { success: true, message: 'Manual event reminders sent' };
};

module.exports = {
  scheduleEventReminders,
  sendDailyEventReminders,
  sendWeeklyEventReminders,
  sendManualEventReminders
};
