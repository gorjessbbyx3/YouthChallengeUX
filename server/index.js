const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory');
}

// Database initialization
const db = require('./database/init');
db.initialize();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cadets', require('./routes/cadets'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/mentorship', require('./routes/mentorship'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/cadets', require('./routes/cadets'));
app.use('/api/events', require('./routes/events'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/scheduling', require('./routes/scheduling'));
app.use('/api/compatibility', require('./routes/compatibility'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/behavioral-tracking', require('./routes/behavioral-tracking'));
app.use('/api/academic-tracking', require('./routes/academic-tracking'));
app.use('/api/communications', require('./routes/communications'));
app.use('/api/documents', require('./routes/documents'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Import utilities
const { initializeReminderSchedule } = require('./utils/mentorshipReminders');
const { initializeSchedulingReminders } = require('./utils/schedulingReminders');

// Initialize reminder schedulers
initializeReminderSchedule();
initializeSchedulingReminders();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YCA CRM Server running on port ${PORT}`);
  console.log('Mentorship reminder system active');
});

module.exports = app;