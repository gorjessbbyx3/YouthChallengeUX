
const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all communications
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT c.*, 
           cadets.first_name as cadet_first_name, 
           cadets.last_name as cadet_last_name,
           staff.first_name as staff_first_name,
           staff.last_name as staff_last_name
    FROM communications c
    LEFT JOIN cadets ON c.cadet_id = cadets.id
    LEFT JOIN staff ON c.sent_by = staff.id
    ORDER BY c.created_at DESC
  `, (err, communications) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(communications);
  });
});

// Get communications for specific cadet
router.get('/cadet/:cadetId', authenticateToken, (req, res) => {
  const { cadetId } = req.params;
  
  db.all(`
    SELECT c.*, 
           cadets.first_name as cadet_first_name, 
           cadets.last_name as cadet_last_name,
           staff.first_name as staff_first_name,
           staff.last_name as staff_last_name
    FROM communications c
    LEFT JOIN cadets ON c.cadet_id = cadets.id
    LEFT JOIN staff ON c.sent_by = staff.id
    WHERE c.cadet_id = ?
    ORDER BY c.created_at DESC
  `, [cadetId], (err, communications) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(communications);
  });
});

// Create new communication
router.post('/', authenticateToken, (req, res) => {
  const { 
    cadet_id, 
    recipient_type, 
    recipient_contact, 
    method, 
    subject, 
    message, 
    priority, 
    follow_up_required, 
    follow_up_date 
  } = req.body;
  
  const sent_by = req.user.id; // From auth token
  
  db.run(`
    INSERT INTO communications (
      cadet_id, recipient_type, recipient_contact, method, subject, 
      message, priority, follow_up_required, follow_up_date, sent_by, 
      status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
  `, [
    cadet_id, recipient_type, recipient_contact, method, subject, 
    message, priority, follow_up_required, follow_up_date, sent_by
  ], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    // Log communication for analytics
    logCommunicationMetrics(cadet_id, method, priority);
    
    res.status(201).json({ 
      id: this.lastID, 
      message: 'Communication sent successfully' 
    });
  });
});

// Get family engagement analytics
router.get('/analytics/engagement', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      c.cadet_id,
      cadets.first_name,
      cadets.last_name,
      COUNT(*) as total_communications,
      COUNT(CASE WHEN c.created_at >= date('now', '-30 days') THEN 1 END) as recent_communications,
      MAX(c.created_at) as last_communication,
      AVG(CASE WHEN c.priority = 'urgent' THEN 4 
               WHEN c.priority = 'high' THEN 3 
               WHEN c.priority = 'normal' THEN 2 
               ELSE 1 END) as avg_priority_score
    FROM communications c
    LEFT JOIN cadets ON c.cadet_id = cadets.id
    WHERE cadets.status = 'active'
    GROUP BY c.cadet_id
    ORDER BY recent_communications DESC, total_communications DESC
  `, (err, analytics) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate engagement levels
    const engagementData = analytics.map(cadet => {
      let engagementLevel = 'No Contact';
      let engagementScore = 0;
      
      if (cadet.recent_communications >= 4) {
        engagementLevel = 'High Engagement';
        engagementScore = 4;
      } else if (cadet.recent_communications >= 2) {
        engagementLevel = 'Good Contact';
        engagementScore = 3;
      } else if (cadet.recent_communications >= 1) {
        engagementLevel = 'Limited Contact';
        engagementScore = 2;
      } else {
        engagementLevel = 'No Recent Contact';
        engagementScore = 1;
      }
      
      return {
        ...cadet,
        engagement_level: engagementLevel,
        engagement_score: engagementScore
      };
    });
    
    res.json({
      cadets: engagementData,
      summary: {
        total_cadets: analytics.length,
        high_engagement: engagementData.filter(c => c.engagement_score === 4).length,
        good_contact: engagementData.filter(c => c.engagement_score === 3).length,
        limited_contact: engagementData.filter(c => c.engagement_score === 2).length,
        no_contact: engagementData.filter(c => c.engagement_score === 1).length
      }
    });
  });
});

// Send bulk communications
router.post('/bulk', authenticateToken, (req, res) => {
  const { cadet_ids, template_type, custom_message, priority } = req.body;
  const sent_by = req.user.id;
  
  const templates = {
    progress_report: {
      subject: 'Weekly Progress Report - {cadet_name}',
      message: 'Dear Family,\n\nHere is your weekly update on {cadet_name}\'s progress at YCA...'
    },
    graduation_invite: {
      subject: 'Graduation Ceremony Invitation - {cadet_name}',
      message: 'Dear Family,\n\nWe are excited to invite you to {cadet_name}\'s graduation ceremony...'
    },
    parent_conference: {
      subject: 'Parent Conference Scheduling - {cadet_name}',
      message: 'Dear Family,\n\nWe would like to schedule a parent conference to discuss {cadet_name}\'s progress...'
    }
  };
  
  const template = templates[template_type];
  if (!template) {
    return res.status(400).json({ error: 'Invalid template type' });
  }
  
  // Get cadet information for personalization
  const placeholders = cadet_ids.map(id => '?').join(',');
  db.all(`
    SELECT id, first_name, last_name, parent_email, parent_phone 
    FROM cadets 
    WHERE id IN (${placeholders})
  `, cadet_ids, (err, cadets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const bulkInserts = cadets.map(cadet => {
      const personalizedSubject = template.subject.replace('{cadet_name}', `${cadet.first_name} ${cadet.last_name}`);
      const personalizedMessage = (custom_message || template.message).replace('{cadet_name}', cadet.first_name);
      
      return [
        cadet.id, 'parent', cadet.parent_email || cadet.parent_phone, 
        cadet.parent_email ? 'email' : 'sms', personalizedSubject, 
        personalizedMessage, priority || 'normal', false, null, sent_by, 'sent'
      ];
    });
    
    // Insert all communications
    const insertPromises = bulkInserts.map(insert => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO communications (
            cadet_id, recipient_type, recipient_contact, method, subject, 
            message, priority, follow_up_required, follow_up_date, sent_by, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, insert, function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    });
    
    Promise.all(insertPromises)
      .then(ids => {
        res.json({ 
          message: `${ids.length} communications sent successfully`,
          communication_ids: ids 
        });
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  });
});

// Get follow-up reminders
router.get('/follow-ups', authenticateToken, (req, res) => {
  db.all(`
    SELECT c.*, 
           cadets.first_name as cadet_first_name, 
           cadets.last_name as cadet_last_name
    FROM communications c
    LEFT JOIN cadets ON c.cadet_id = cadets.id
    WHERE c.follow_up_required = 1 
      AND c.follow_up_date <= date('now', '+7 days')
      AND c.follow_up_completed != 1
    ORDER BY c.follow_up_date ASC
  `, (err, followUps) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(followUps);
  });
});

function logCommunicationMetrics(cadetId, method, priority) {
  // Track communication patterns for insights
  db.run(`
    INSERT OR REPLACE INTO communication_metrics (
      cadet_id, total_communications, last_communication, 
      email_count, sms_count, phone_count, urgent_count
    ) VALUES (
      ?, 
      COALESCE((SELECT total_communications FROM communication_metrics WHERE cadet_id = ?), 0) + 1,
      datetime('now'),
      COALESCE((SELECT email_count FROM communication_metrics WHERE cadet_id = ?), 0) + CASE WHEN ? = 'email' THEN 1 ELSE 0 END,
      COALESCE((SELECT sms_count FROM communication_metrics WHERE cadet_id = ?), 0) + CASE WHEN ? = 'sms' THEN 1 ELSE 0 END,
      COALESCE((SELECT phone_count FROM communication_metrics WHERE cadet_id = ?), 0) + CASE WHEN ? = 'phone' THEN 1 ELSE 0 END,
      COALESCE((SELECT urgent_count FROM communication_metrics WHERE cadet_id = ?), 0) + CASE WHEN ? = 'urgent' THEN 1 ELSE 0 END
    )
  `, [cadetId, cadetId, cadetId, method, cadetId, method, cadetId, method, cadetId, priority]);
}

module.exports = router;
