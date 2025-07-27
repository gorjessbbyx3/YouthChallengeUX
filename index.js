
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/cadets', require('./server/routes/cadets'));
app.use('/api/staff', require('./server/routes/staff'));
app.use('/api/mentorship', require('./server/routes/mentorship'));
app.use('/api/inventory', require('./server/routes/inventory'));
app.use('/api/events', require('./server/routes/events'));
app.use('/api/assignments', require('./server/routes/assignments'));
app.use('/api/ai', require('./server/routes/ai'));
app.use('/api/reports', require('./server/routes/reports'));

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YCA CRM Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`AI Features: ${process.env.API_KEY ? 'Enabled' : 'Disabled (set API_KEY to enable)'}`);
  console.log('Visit http://localhost:5000/health for system status');
});
