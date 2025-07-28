const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../database/supabase');
const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all events with staff and cadet assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        event_staff_assignments(
          staff_id,
          staff(name)
        ),
        event_cadet_assignments(
          cadet_id,
          cadets(name)
        )
      `)
      .order('start_date', { ascending: true });

    if (error) throw error;

    // Transform data for better frontend consumption
    const transformedEvents = events.map(event => ({
      ...event,
      assigned_staff: event.event_staff_assignments?.map(a => ({ 
        id: a.staff_id, 
        name: a.staff?.name 
      })) || [],
      assigned_cadets: event.event_cadet_assignments?.map(a => ({ 
        id: a.cadet_id, 
        name: a.cadets?.name 
      })) || []
    }));

    res.json(transformedEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single event with assignments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: event, error } = await supabase
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
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Transform data
    const transformedEvent = {
      ...event,
      assigned_staff: event.event_staff_assignments?.map(a => ({ 
        id: a.staff_id, 
        name: a.staff?.name,
        email: a.staff?.email
      })) || [],
      assigned_cadets: event.event_cadet_assignments?.map(a => ({ 
        id: a.cadet_id, 
        name: a.cadets?.name,
        email: a.cadets?.email
      })) || []
    };

    res.json(transformedEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event with staff and cadet assignments
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { assigned_staff, assigned_cadets, ...eventData } = req.body;

    // Validate staff availability
    if (assigned_staff && assigned_staff.length > 0) {
      const availability = await checkStaffAvailability(assigned_staff, eventData.start_date, eventData.end_date);
      if (!availability.all_available) {
        return res.status(400).json({ 
          error: 'Some staff members are not available during this time',
          unavailable_staff: availability.unavailable_staff
        });
      }
    }

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (eventError) throw eventError;

    // Add staff assignments
    if (assigned_staff && assigned_staff.length > 0) {
      const staffAssignments = assigned_staff.map(staffId => ({
        event_id: event.id,
        staff_id: staffId
      }));

      const { error: staffError } = await supabase
        .from('event_staff_assignments')
        .insert(staffAssignments);

      if (staffError) throw staffError;
    }

    // Add cadet assignments
    if (assigned_cadets && assigned_cadets.length > 0) {
      const cadetAssignments = assigned_cadets.map(cadetId => ({
        event_id: event.id,
        cadet_id: cadetId
      }));

      const { error: cadetError } = await supabase
        .from('event_cadet_assignments')
        .insert(cadetAssignments);

      if (cadetError) throw cadetError;
    }

    // Send event creation notifications
    await sendEventNotifications(event.id, 'created');

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { assigned_staff, assigned_cadets, ...eventData } = req.body;

    // Validate staff availability if staff assignments changed
    if (assigned_staff && assigned_staff.length > 0) {
      const availability = await checkStaffAvailability(assigned_staff, eventData.start_date, eventData.end_date, req.params.id);
      if (!availability.all_available) {
        return res.status(400).json({ 
          error: 'Some staff members are not available during this time',
          unavailable_staff: availability.unavailable_staff
        });
      }
    }

    // Update event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Update staff assignments
    if (assigned_staff !== undefined) {
      // Delete existing assignments
      await supabase
        .from('event_staff_assignments')
        .delete()
        .eq('event_id', req.params.id);

      // Add new assignments
      if (assigned_staff.length > 0) {
        const staffAssignments = assigned_staff.map(staffId => ({
          event_id: req.params.id,
          staff_id: staffId
        }));

        await supabase
          .from('event_staff_assignments')
          .insert(staffAssignments);
      }
    }

    // Update cadet assignments
    if (assigned_cadets !== undefined) {
      // Delete existing assignments
      await supabase
        .from('event_cadet_assignments')
        .delete()
        .eq('event_id', req.params.id);

      // Add new assignments
      if (assigned_cadets.length > 0) {
        const cadetAssignments = assigned_cadets.map(cadetId => ({
          event_id: req.params.id,
          cadet_id: cadetId
        }));

        await supabase
          .from('event_cadet_assignments')
          .insert(cadetAssignments);
      }
    }

    // Send update notifications
    await sendEventNotifications(req.params.id, 'updated');

    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Delete assignments first
    await supabase
      .from('event_staff_assignments')
      .delete()
      .eq('event_id', req.params.id);

    await supabase
      .from('event_cadet_assignments')
      .delete()
      .eq('event_id', req.params.id);

    // Delete event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get calendar view events (filtered by date range)
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_type,
        start_date,
        end_date,
        location,
        community_service_hours
      `)
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString())
      .order('start_date', { ascending: true });

    if (error) throw error;

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send reminders for upcoming events
router.post('/send-reminders', authenticateToken, async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

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
      .gte('start_date', tomorrowStart.toISOString())
      .lte('start_date', tomorrowEnd.toISOString());

    if (error) throw error;

    let sentCount = 0;
    for (const event of events) {
      await sendEventReminders(event);
      sentCount++;
    }

    res.json({ message: `Sent reminders for ${sentCount} events` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check staff availability
async function checkStaffAvailability(staffIds, startDate, endDate, excludeEventId = null) {
  try {
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        start_date,
        end_date,
        event_staff_assignments(staff_id)
      `)
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data: conflictingEvents, error } = await query;
    if (error) throw error;

    const busyStaffIds = new Set();
    conflictingEvents.forEach(event => {
      event.event_staff_assignments?.forEach(assignment => {
        busyStaffIds.add(assignment.staff_id);
      });
    });

    const unavailableStaff = staffIds.filter(staffId => busyStaffIds.has(staffId));

    return {
      all_available: unavailableStaff.length === 0,
      unavailable_staff: unavailableStaff
    };
  } catch (error) {
    throw error;
  }
}

// Helper function to send event notifications
async function sendEventNotifications(eventId, action) {
  try {
    const { data: event } = await supabase
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
      .eq('id', eventId)
      .single();

    if (!event) return;

    const subject = `Event ${action}: ${event.title}`;
    const eventDate = new Date(event.start_date).toLocaleDateString();
    const eventTime = new Date(event.start_date).toLocaleTimeString();

    const message = `
      <h2>Event ${action}: ${event.title}</h2>
      <p><strong>Date:</strong> ${eventDate}</p>
      <p><strong>Time:</strong> ${eventTime}</p>
      <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
      <p><strong>Type:</strong> ${event.event_type}</p>
      ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
      ${event.community_service_hours ? `<p><strong>Service Hours:</strong> ${event.community_service_hours}</p>` : ''}
    `;

    // Send to assigned staff
    const staffEmails = event.event_staff_assignments
      ?.map(a => a.staff?.email)
      .filter(email => email);

    // Send to assigned cadets
    const cadetEmails = event.event_cadet_assignments
      ?.map(a => a.cadets?.email)
      .filter(email => email);

    const allEmails = [...(staffEmails || []), ...(cadetEmails || [])];

    if (allEmails.length > 0) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
        to: allEmails.join(','),
        subject,
        html: message
      });
    }
  } catch (error) {
    console.error('Error sending event notifications:', error);
  }
}

// Helper function to send event reminders
async function sendEventReminders(event) {
  try {
    const eventDate = new Date(event.start_date).toLocaleDateString();
    const eventTime = new Date(event.start_date).toLocaleTimeString();

    const subject = `Reminder: ${event.title} Tomorrow`;
    const message = `
      <h2>Event Reminder: ${event.title}</h2>
      <p>This is a reminder that you have an event scheduled for tomorrow:</p>
      <p><strong>Date:</strong> ${eventDate}</p>
      <p><strong>Time:</strong> ${eventTime}</p>
      <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
      <p><strong>Type:</strong> ${event.event_type}</p>
      ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
      <p>Please make sure to arrive on time and bring any necessary materials.</p>
    `;

    // Send to assigned staff
    const staffEmails = event.event_staff_assignments
      ?.map(a => a.staff?.email)
      .filter(email => email);

    // Send to assigned cadets
    const cadetEmails = event.event_cadet_assignments
      ?.map(a => a.cadets?.email)
      .filter(email => email);

    const allEmails = [...(staffEmails || []), ...(cadetEmails || [])];

    if (allEmails.length > 0) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ycacrm.com',
        to: allEmails.join(','),
        subject,
        html: message
      });
    }
  } catch (error) {
    console.error('Error sending event reminders:', error);
  }
}

module.exports = router;
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Email transporter setup
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        event_staff (
          staff:staff_id (id, first_name, last_name, email)
        ),
        event_cadets (
          cadet:cadet_id (id, first_name, last_name)
        )
      `)
      .order('date', { ascending: true });

    if (error) throw error;

    // Format events for calendar display
    const formattedEvents = events.map(event => ({
      ...event,
      assigned_staff: event.event_staff?.map(es => es.staff) || [],
      assigned_cadets: event.event_cadets?.map(ec => ec.cadet) || []
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, date, time, type, location, required_staff, staff_ids, cadet_ids } = req.body;

    // Check staff availability
    const { data: staffSchedules } = await supabase
      .from('staff_schedules')
      .select('staff_id')
      .eq('date', date)
      .in('staff_id', staff_ids || []);

    const unavailableStaff = staffSchedules?.map(s => s.staff_id) || [];
    const availableStaff = (staff_ids || []).filter(id => !unavailableStaff.includes(id));

    if (availableStaff.length < required_staff) {
      return res.status(400).json({ 
        error: 'Insufficient available staff for this event',
        available_staff: availableStaff.length,
        required_staff
      });
    }

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title,
        description,
        date,
        time,
        type,
        location,
        required_staff,
        status: 'scheduled',
        created_by: req.user.id
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Assign staff
    if (staff_ids && staff_ids.length > 0) {
      const staffAssignments = staff_ids.map(staff_id => ({
        event_id: event.id,
        staff_id
      }));

      const { error: staffError } = await supabase
        .from('event_staff')
        .insert(staffAssignments);

      if (staffError) throw staffError;
    }

    // Assign cadets
    if (cadet_ids && cadet_ids.length > 0) {
      const cadetAssignments = cadet_ids.map(cadet_id => ({
        event_id: event.id,
        cadet_id
      }));

      const { error: cadetError } = await supabase
        .from('event_cadets')
        .insert(cadetAssignments);

      if (cadetError) throw cadetError;
    }

    // Send immediate confirmation emails
    await sendEventReminders(event.id, 'created');

    res.status(201).json({ ...event, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update event
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: event, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Send update notifications
    await sendEventReminders(id, 'updated');

    res.json({ ...event, message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Send cancellation emails first
    await sendEventReminders(id, 'cancelled');

    // Delete event (cascades to assignments)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Event cancelled and notifications sent' });
  } catch (error) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get calendar view data
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        event_staff (
          staff:staff_id (first_name, last_name)
        ),
        event_cadets (
          cadet:cadet_id (first_name, last_name)
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) throw error;

    const calendarEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      start: `${event.date}T${event.time}`,
      type: event.type,
      status: event.status,
      staff_count: event.event_staff?.length || 0,
      cadet_count: event.event_cadets?.length || 0,
      color: getEventColor(event.type)
    }));

    res.json(calendarEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send event reminders
async function sendEventReminders(eventId, type = 'reminder') {
  try {
    const { data: event } = await supabase
      .from('events')
      .select(`
        *,
        event_staff (
          staff:staff_id (email, first_name, last_name)
        ),
        event_cadets (
          cadet:cadet_id (email, first_name, last_name)
        )
      `)
      .eq('id', eventId)
      .single();

    if (!event) return;

    const recipients = [
      ...(event.event_staff?.map(es => es.staff) || []),
      ...(event.event_cadets?.map(ec => ec.cadet) || [])
    ].filter(person => person.email);

    const subject = getEmailSubject(type, event);
    const body = getEmailBody(type, event);

    for (const recipient of recipients) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: recipient.email,
        subject,
        html: body.replace('{{name}}', `${recipient.first_name} ${recipient.last_name}`)
      });
    }

    console.log(`Event ${type} notifications sent for: ${event.title}`);
  } catch (error) {
    console.error('Error sending event reminders:', error);
  }
}

function getEmailSubject(type, event) {
  switch (type) {
    case 'created': return `New Event Scheduled: ${event.title}`;
    case 'updated': return `Event Updated: ${event.title}`;
    case 'cancelled': return `Event Cancelled: ${event.title}`;
    case 'reminder': return `Reminder: ${event.title} Tomorrow`;
    default: return `Event Notification: ${event.title}`;
  }
}

function getEmailBody(type, event) {
  const baseInfo = `
    <h3>${event.title}</h3>
    <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
    <p><strong>Time:</strong> ${event.time}</p>
    <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
    <p><strong>Type:</strong> ${event.type}</p>
    ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
  `;

  switch (type) {
    case 'created':
      return `
        <p>Hello {{name}},</p>
        <p>You have been assigned to a new event:</p>
        ${baseInfo}
        <p>Please mark your calendar and prepare accordingly.</p>
        <p>Best regards,<br>YCA CRM System</p>
      `;
    case 'updated':
      return `
        <p>Hello {{name}},</p>
        <p>An event you're assigned to has been updated:</p>
        ${baseInfo}
        <p>Please review the updated details.</p>
        <p>Best regards,<br>YCA CRM System</p>
      `;
    case 'cancelled':
      return `
        <p>Hello {{name}},</p>
        <p>The following event has been cancelled:</p>
        ${baseInfo}
        <p>Please update your schedule accordingly.</p>
        <p>Best regards,<br>YCA CRM System</p>
      `;
    case 'reminder':
      return `
        <p>Hello {{name}},</p>
        <p>This is a reminder that you have an event tomorrow:</p>
        ${baseInfo}
        <p>Please be prepared and arrive on time.</p>
        <p>Best regards,<br>YCA CRM System</p>
      `;
    default:
      return `
        <p>Hello {{name}},</p>
        <p>Event notification:</p>
        ${baseInfo}
        <p>Best regards,<br>YCA CRM System</p>
      `;
  }
}

function getEventColor(type) {
  const colors = {
    'community_service': '#4CAF50',
    'recruitment': '#2196F3',
    'training': '#FF9800',
    'ceremony': '#9C27B0',
    'academic': '#607D8B',
    'physical_training': '#F44336'
  };
  return colors[type] || '#757575';
}

// Schedule automated daily reminders (runs at 6 PM daily)
cron.schedule('0 18 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('date', tomorrowStr)
      .eq('status', 'scheduled');

    for (const event of events || []) {
      await sendEventReminders(event.id, 'reminder');
    }

    console.log(`Daily reminders sent for ${events?.length || 0} events`);
  } catch (error) {
    console.error('Error sending daily reminders:', error);
  }
});

module.exports = router;
