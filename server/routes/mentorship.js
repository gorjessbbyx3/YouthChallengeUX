
const express = require('express');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Sentiment analysis function (placeholder - replace with actual AI service)
const analyzeSentiment = async (text) => {
  try {
    // This is a simplified sentiment analysis
    // In production, you would use Google Cloud Natural Language API, AWS Comprehend, or Hugging Face
    const negativeWords = ['struggling', 'unmotivated', 'missed', 'failed', 'angry', 'frustrated', 'depressed', 'anxious', 'worried', 'stressed', 'difficult', 'problems', 'issues', 'concerns', 'challenges'];
    const positiveWords = ['excellent', 'great', 'improved', 'motivated', 'success', 'achieved', 'happy', 'confident', 'progress', 'accomplishment', 'proud', 'excited', 'determined'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (negativeWords.includes(word)) score -= 1;
      if (positiveWords.includes(word)) score += 1;
    });
    
    // Normalize score to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, score / words.length * 10));
    
    return {
      score: normalizedScore,
      magnitude: Math.abs(normalizedScore),
      confidence: 0.8 // Placeholder confidence
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return { score: 0, magnitude: 0, confidence: 0 };
  }
};

// Get all mentorship relationships
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mentorship_relationships')
      .select(`
        *,
        cadets (
          id, first_name, last_name, platoon
        ),
        staff (
          id, first_name, last_name, role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching mentorships:', error);
    res.status(500).json({ error: 'Failed to fetch mentorships' });
  }
});

// Create new mentorship relationship
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { cadet_id, mentor_id, program_type, start_date, goals, notes } = req.body;
    
    const { data, error } = await supabase
      .from('mentorship_relationships')
      .insert([{
        cadet_id,
        mentor_id,
        program_type,
        start_date,
        goals: JSON.stringify(goals || []),
        notes,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating mentorship:', error);
    res.status(500).json({ error: 'Failed to create mentorship' });
  }
});

// Update mentorship relationship
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, goals, notes, end_date } = req.body;

    const updateData = { notes };
    if (status) updateData.status = status;
    if (goals) updateData.goals = JSON.stringify(goals);
    if (end_date) updateData.end_date = end_date;

    const { data, error } = await supabase
      .from('mentorship_relationships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating mentorship:', error);
    res.status(500).json({ error: 'Failed to update mentorship' });
  }
});

// Get mentorship logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mentorship_logs')
      .select(`
        *,
        cadets (first_name, last_name),
        staff (first_name, last_name)
      `)
      .order('session_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching mentorship logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Create mentorship log entry
router.post('/logs', authenticateToken, async (req, res) => {
  try {
    const { cadet_id, mentor_id, session_date, session_type, notes, goals_set, progress_rating } = req.body;
    
    // Analyze sentiment of the notes
    const sentimentAnalysis = await analyzeSentiment(notes);
    
    const { data, error } = await supabase
      .from('mentorship_logs')
      .insert([{
        cadet_id,
        mentor_id,
        session_date,
        session_type,
        notes,
        goals_set: JSON.stringify(goals_set || []),
        progress_rating,
        sentiment_score: sentimentAnalysis.score,
        sentiment_magnitude: sentimentAnalysis.magnitude,
        sentiment_confidence: sentimentAnalysis.confidence
      }])
      .select()
      .single();

    if (error) throw error;
    
    // If sentiment is negative, create an alert
    if (sentimentAnalysis.score < -0.3 && sentimentAnalysis.confidence > 0.7) {
      console.log(`ALERT: Negative sentiment detected for cadet ${cadet_id}: ${notes.substring(0, 100)}...`);
      // Here you could send email notifications, create tasks, etc.
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating mentorship log:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

// Get mentorship logs for specific cadet
router.get('/cadet/:cadetId', authenticateToken, async (req, res) => {
  try {
    const { cadetId } = req.params;
    
    const { data, error } = await supabase
      .from('mentorship_logs')
      .select(`
        *,
        staff (first_name, last_name)
      `)
      .eq('cadet_id', cadetId)
      .order('session_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching cadet mentorship logs:', error);
    res.status(500).json({ error: 'Failed to fetch cadet logs' });
  }
});

// Get mentorship statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { data: relationships } = await supabase
      .from('mentorship_relationships')
      .select('status');

    const { data: logs } = await supabase
      .from('mentorship_logs')
      .select('progress_rating, sentiment_score')
      .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const stats = {
      active_mentorships: relationships?.filter(r => r.status === 'active').length || 0,
      completed_mentorships: relationships?.filter(r => r.status === 'completed').length || 0,
      total_sessions_this_month: logs?.length || 0,
      average_progress_rating: logs?.length > 0 
        ? logs.reduce((sum, log) => sum + (log.progress_rating || 0), 0) / logs.length 
        : 0,
      negative_sentiment_alerts: logs?.filter(log => log.sentiment_score < -0.3).length || 0,
      average_sentiment: logs?.length > 0
        ? logs.reduce((sum, log) => sum + (log.sentiment_score || 0), 0) / logs.length
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching mentorship stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get sentiment alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mentorship_logs')
      .select(`
        *,
        cadets (first_name, last_name),
        staff (first_name, last_name)
      `)
      .lt('sentiment_score', -0.3)
      .gte('sentiment_confidence', 0.7)
      .order('session_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching sentiment alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Mark alert as resolved
router.put('/alerts/:logId/resolve', authenticateToken, async (req, res) => {
  try {
    const { logId } = req.params;
    const { action_taken } = req.body;

    const { data, error } = await supabase
      .from('mentorship_logs')
      .update({ 
        alert_resolved: true,
        action_taken: action_taken,
        resolved_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

module.exports = router;
