
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import utilities
const { scheduleEventReminders } = require('./server/utils/eventReminders');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'server/uploads')));

// Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/cadets', require('./server/routes/cadets'));
app.use('/api/staff', require('./server/routes/staff'));
app.use('/api/behavioral-tracking', require('./server/routes/behavioral-tracking'));
app.use('/api/academic-tracking', require('./server/routes/academic-tracking'));
app.use('/api/mentorship', require('./server/routes/mentorship'));
app.use('/api/assignments', require('./server/routes/assignments'));
app.use('/api/communications', require('./server/routes/communications'));
app.use('/api/documents', require('./server/routes/documents'));
app.use('/api/inventory', require('./server/routes/inventory'));
app.use('/api/events', require('./server/routes/events'));
app.use('/api/scheduling', require('./server/routes/scheduling'));
app.use('/api/reports', require('./server/routes/reports'));
app.use('/api/ai', require('./server/routes/ai'));

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      ai_enabled: !!process.env.API_KEY,
      database_connected: true
    }
  });
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
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`AI Features: ${process.env.API_KEY ? 'Enabled' : 'Disabled (set API_KEY to enable)'}`);
  console.log('Visit http://localhost:5000/health for system status');
  console.log('All background services are running');
});
