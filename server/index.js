const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import utilities
const { scheduleEventReminders } = require('./utils/eventReminders');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cadets', require('./routes/cadets'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/behavioral-tracking', require('./routes/behavioral-tracking'));
app.use('/api/academic-tracking', require('./routes/academic-tracking'));
app.use('/api/mentorship', require('./routes/mentorship'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/communications', require('./routes/communications'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/events', require('./routes/events'));
app.use('/api/scheduling', require('./routes/scheduling'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', require('./routes/ai'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'YCA CRM API Server',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/cadets',
      '/api/staff',
      '/api/behavioral-tracking',
      '/api/academic-tracking',
      '/api/mentorship',
      '/api/assignments',
      '/api/communications',
      '/api/documents',
      '/api/inventory',
      '/api/events',
      '/api/scheduling',
      '/api/reports',
      '/api/ai'
    ]
  });
});

// Initialize schedulers and background tasks
console.log('Initializing background services...');
scheduleEventReminders();
console.log('Event reminder scheduler initialized');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YCA CRM Server running on port ${PORT}`);
  console.log('All background services are running');
});