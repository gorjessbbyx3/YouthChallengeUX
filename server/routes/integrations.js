
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const { google } = require('googleapis');
const router = express.Router();

// Google Calendar integration
router.post('/google-calendar/sync', authenticateToken, async (req, res) => {
  try {
    const { access_token } = req.body;
    
    const calendar = google.calendar({ version: 'v3' });
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token });

    // Get events from our database
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .eq('status', 'scheduled');

    if (error) throw error;

    let synced = 0;
    for (const event of events) {
      try {
        await calendar.events.insert({
          auth,
          calendarId: 'primary',
          resource: {
            summary: event.title,
            description: event.description,
            start: {
              dateTime: event.start_date,
              timeZone: 'Pacific/Honolulu'
            },
            end: {
              dateTime: event.end_date,
              timeZone: 'Pacific/Honolulu'
            },
            location: event.location
          }
        });
        synced++;
      } catch (syncError) {
        console.error('Error syncing event:', syncError);
      }
    }

    res.json({ success: true, synced_events: synced });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get integration settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const { data: integrations, error } = await supabase
      .from('external_integrations')
      .select('*');

    if (error) throw error;
    res.json(integrations || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update integration settings
router.put('/settings/:service', authenticateToken, async (req, res) => {
  try {
    const { service } = req.params;
    const { settings, enabled } = req.body;

    const { data, error } = await supabase
      .from('external_integrations')
      .upsert([{
        service_name: service,
        settings,
        enabled,
        last_sync: enabled ? new Date().toISOString() : null
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
