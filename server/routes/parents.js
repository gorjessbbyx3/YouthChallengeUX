
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get parents for a cadet
router.get('/cadet/:cadetId', authenticateToken, async (req, res) => {
  try {
    const { data: parents, error } = await supabase
      .from('parents')
      .select('*')
      .eq('cadet_id', req.params.cadetId);

    if (error) throw error;
    res.json(parents || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create parent account
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { cadet_id, first_name, last_name, email, phone, relationship } = req.body;
    
    const { data, error } = await supabase
      .from('parents')
      .insert([{
        cadet_id,
        first_name,
        last_name,
        email,
        phone,
        relationship,
        access_granted: true,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get parent dashboard data
router.get('/dashboard/:parentId', authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('*, cadets(*)')
      .eq('id', parentId)
      .single();

    if (parentError) throw parentError;

    // Get cadet's recent activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('cadet_id', parent.cadet_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    res.json({
      parent,
      cadet: parent.cadets,
      recent_activities: activities || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
