const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connections
const { testConnection, initializeTables } = require('./database/postgresql');

// Import utilities
const { scheduleEventReminders } = require('./utils/eventReminders');

// Import routes
const authRoutes = require('./routes/auth');
const cadetRoutes = require('./routes/cadets');
const staffRoutes = require('./routes/staff');
const inventoryRoutes = require('./routes/inventory');
const mentorshipRoutes = require('./routes/mentorship');
const schedulingRoutes = require('./routes/scheduling');
const assignmentRoutes = require('./routes/assignments');
const aiRoutes = require('./routes/ai');
const reportsRoutes = require('./routes/reports');
const communicationsRoutes = require('./routes/communications');
const documentsRoutes = require('./routes/documents');
const eventsRoutes = require('./routes/events');
const behavioralRoutes = require('./routes/behavioral-tracking');
const academicRoutes = require('./routes/academic-tracking');
const roomAssignmentsRoutes = require('./routes/room-assignments');
const supervisorAssignmentsRoutes = require('./routes/supervisor-assignments');
const parentsRoutes = require('./routes/parents');
const milestonesRoutes = require('./routes/milestones');
const complianceRoutes = require('./routes/compliance');
const analyticsRoutes = require('./routes/analytics');
const integrationsRoutes = require('./routes/integrations');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/cadets', cadetRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/behavioral-tracking', behavioralRoutes);
app.use('/api/academic-tracking', academicRoutes);
app.use('/api/room-assignments', roomAssignmentsRoutes);
app.use('/api/supervisor-assignments', supervisorAssignmentsRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/milestones', milestonesRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationsRoutes);


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
      '/api/ai',
      '/api/parents',
      '/api/milestones',
      '/api/compliance',
      '/api/analytics',
      '/api/integrations'
    ]
  });
});

// Initialize database and background tasks
const initializeServer = async () => {
  try {
    console.log('Initializing database connection...');
    await testConnection();
    await initializeTables();
    console.log('Database initialized successfully');

    console.log('Initializing background services...');
    scheduleEventReminders();
    console.log('Event reminder scheduler initialized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`YCA CRM Server running on port ${PORT}`);
      console.log('All services are running');
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

initializeServer();