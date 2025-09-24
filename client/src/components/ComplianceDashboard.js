
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';

const ComplianceDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [logDialog, setLogDialog] = useState(false);
  const [newLog, setNewLog] = useState({
    regulation: '',
    status: 'compliant',
    description: ''
  });

  useEffect(() => {
    fetchOverview();
    fetchRegulations();
  }, []);

  const fetchOverview = async () => {
    try {
      const response = await axios.get('/api/compliance/overview');
      setOverview(response.data.overview);
      setRecentLogs(response.data.recent_logs);
    } catch (error) {
      console.error('Error fetching compliance overview:', error);
    }
  };

  const fetchRegulations = async () => {
    try {
      const response = await axios.get('/api/compliance/dod-regulations');
      setRegulations(response.data);
    } catch (error) {
      console.error('Error fetching regulations:', error);
    }
  };

  const createLog = async () => {
    try {
      await axios.post('/api/compliance/log', {
        ...newLog,
        staff_id: 'current_user' // Replace with actual user ID
      });

      setLogDialog(false);
      setNewLog({
        regulation: '',
        status: 'compliant',
        description: ''
      });
      fetchOverview();
      alert('Compliance log created successfully!');
    } catch (error) {
      console.error('Error creating compliance log:', error);
      alert('Failed to create compliance log.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'compliant':
        return <CheckIcon color="success" />;
      case 'non_compliant':
        return <ErrorIcon color="error" />;
      case 'pending':
        return <WarningIcon color="warning" />;
      default:
        return <SecurityIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant':
        return 'success';
      case 'non_compliant':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (!overview) {
    return <Box sx={{ p: 3 }}><Typography>Loading compliance data...</Typography></Box>;
  }

  const complianceRate = overview.total_checks > 0 ? 
    (overview.compliant / overview.total_checks) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <SecurityIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          DoD Compliance Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setLogDialog(true)}
        >
          Log Compliance Check
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {overview.total_checks}
              </Typography>
              <Typography color="text.secondary">Total Checks</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {overview.compliant}
              </Typography>
              <Typography color="text.secondary">Compliant</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {overview.non_compliant}
              </Typography>
              <Typography color="text.secondary">Non-Compliant</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {overview.pending_review}
              </Typography>
              <Typography color="text.secondary">Pending Review</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance Rate */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Compliance Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={complianceRate}
                    color={complianceRate >= 90 ? 'success' : complianceRate >= 75 ? 'warning' : 'error'}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {complianceRate.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              <Alert 
                severity={complianceRate >= 90 ? 'success' : complianceRate >= 75 ? 'warning' : 'error'}
              >
                {complianceRate >= 90 
                  ? 'Excellent compliance rate - exceeding DoD standards'
                  : complianceRate >= 75 
                    ? 'Good compliance rate - minor improvements needed'
                    : 'Compliance rate needs improvement - immediate attention required'
                }
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* DoD Regulations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                DoD Regulations Checklist
              </Typography>
              <List>
                {regulations.map((regulation) => (
                  <ListItem key={regulation.id}>
                    <ListItemIcon>
                      <SecurityIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={regulation.title}
                      secondary={`${regulation.description} (${regulation.frequency})`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Logs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Compliance Logs
              </Typography>
              {recentLogs.length > 0 ? (
                <List>
                  {recentLogs.map((log) => (
                    <ListItem key={log.id}>
                      <ListItemIcon>
                        {getStatusIcon(log.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={log.regulation}
                        secondary={
                          <Box>
                            <Chip 
                              label={log.status} 
                              size="small" 
                              color={getStatusColor(log.status)}
                              sx={{ mr: 1 }}
                            />
                            {new Date(log.created_at).toLocaleDateString()}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No recent compliance logs
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Log Dialog */}
      <Dialog open={logDialog} onClose={() => setLogDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Compliance Check</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Regulation</InputLabel>
                <Select
                  value={newLog.regulation}
                  onChange={(e) => setNewLog({...newLog, regulation: e.target.value})}
                >
                  {regulations.map((regulation) => (
                    <MenuItem key={regulation.id} value={regulation.title}>
                      {regulation.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newLog.status}
                  onChange={(e) => setNewLog({...newLog, status: e.target.value})}
                >
                  <MenuItem value="compliant">Compliant</MenuItem>
                  <MenuItem value="non_compliant">Non-Compliant</MenuItem>
                  <MenuItem value="pending">Pending Review</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newLog.description}
                onChange={(e) => setNewLog({...newLog, description: e.target.value})}
                placeholder="Details about the compliance check..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialog(false)}>Cancel</Button>
          <Button 
            onClick={createLog} 
            variant="contained"
            disabled={!newLog.regulation}
          >
            Log Compliance Check
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceDashboard;
