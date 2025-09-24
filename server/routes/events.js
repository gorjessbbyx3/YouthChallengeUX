const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../database/supabase');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const emailService = require('../services/emailService'); // Assuming emailService is set up for Neo Database

// Email transporter configuration (Nodemailer setup is now for fallback or if emailService is not used)
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
      await emailService.sendEmail({
        to: allEmails,
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
      await emailService.sendEmail({
        to: allEmails,
        subject,
        html: message
      });
    }
  } catch (error) {
    console.error('Error sending event reminders:', error);
  }
}

module.exports = router;