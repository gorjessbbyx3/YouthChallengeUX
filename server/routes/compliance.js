
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get compliance overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('compliance_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const overview = {
      total_checks: logs?.length || 0,
      compliant: logs?.filter(l => l.status === 'compliant').length || 0,
      non_compliant: logs?.filter(l => l.status === 'non_compliant').length || 0,
      pending_review: logs?.filter(l => l.status === 'pending').length || 0
    };

    res.json({ overview, recent_logs: logs?.slice(0, 10) || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create compliance log
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const { regulation, status, description, cadet_id, staff_id } = req.body;
    
    const { data, error } = await supabase
      .from('compliance_logs')
      .insert([{
        regulation,
        status,
        description,
        cadet_id,
        staff_id,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get DoD regulations checklist
router.get('/dod-regulations', authenticateToken, (req, res) => {
  const regulations = [
    { id: 1, title: 'Background Checks', description: 'All staff must have current background checks', frequency: 'annual' },
    { id: 2, title: 'Safety Training', description: 'Monthly safety training completion', frequency: 'monthly' },
    { id: 3, title: 'Document Retention', description: 'Proper document storage and retention', frequency: 'ongoing' },
    { id: 4, title: 'Progress Reporting', description: 'Quarterly progress reports to DoD', frequency: 'quarterly' },
    { id: 5, title: 'Facility Inspections', description: 'Regular facility safety inspections', frequency: 'monthly' }
  ];
  
  res.json(regulations);
});

module.exports = router;
