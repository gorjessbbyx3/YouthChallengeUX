
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all milestone types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const milestoneTypes = [
      { id: 1, name: 'Academic Excellence', description: 'Outstanding academic performance', points: 50 },
      { id: 2, name: 'Leadership', description: 'Demonstrated leadership skills', points: 75 },
      { id: 3, name: 'Community Service', description: '100+ community service hours', points: 100 },
      { id: 4, name: 'Behavioral Improvement', description: 'Significant behavioral progress', points: 60 },
      { id: 5, name: 'Graduation Ready', description: 'Ready for program completion', points: 200 }
    ];
    
    res.json(milestoneTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cadet milestones
router.get('/cadet/:cadetId', authenticateToken, async (req, res) => {
  try {
    const { data: milestones, error } = await supabase
      .from('cadet_milestones')
      .select('*')
      .eq('cadet_id', req.params.cadetId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    res.json(milestones || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Award milestone to cadet
router.post('/award', authenticateToken, async (req, res) => {
  try {
    const { cadet_id, milestone_type, notes, awarded_by } = req.body;
    
    const { data, error } = await supabase
      .from('cadet_milestones')
      .insert([{
        cadet_id,
        milestone_type,
        notes,
        awarded_by,
        earned_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
