
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Badge
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  Add as AddIcon,
  Send as SendIcon,
  Family as FamilyIcon,
  Notifications as NotificationsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import axios from 'axios';

export const Communications = () => {
  const [communications, setCommunications] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [newCommunication, setNewCommunication] = useState({
    cadet_id: '',
    recipient_type: 'parent',
    recipient_contact: '',
    method: 'email',
    subject: '',
    message: '',
    priority: 'normal',
    follow_up_required: false,
    follow_up_date: ''
  });

  useEffect(() => {
    fetchCommunications();
    fetchCadets();
    fetchStaff();
  }, []);

  const fetchCommunications = async () => {
    try {
      const response = await axios.get('/api/communications');
      setCommunications(response.data);
    } catch (error) {
      console.error('Error fetching communications:', error);
    }
  };

  const fetchCadets = async () => {
    try {
      const response = await axios.get('/api/cadets');
      setCadets(response.data);
    } catch (error) {
      console.error('Error fetching cadets:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/communications', newCommunication);
      setOpen(false);
      setNewCommunication({
        cadet_id: '',
        recipient_type: 'parent',
        recipient_contact: '',
        method: 'email',
        subject: '',
        message: '',
        priority: 'normal',
        follow_up_required: false,
        follow_up_date: ''
      });
      fetchCommunications();
    } catch (error) {
      console.error('Error creating communication:', error);
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'email': return <EmailIcon />;
      case 'sms': return <SmsIcon />;
      case 'phone': return <PhoneIcon />;
      default: return <EmailIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'info';
    }
  };

  const getEngagementLevel = (cadetId) => {
    const cadetCommunications = communications.filter(c => c.cadet_id === cadetId);
    if (cadetCommunications.length === 0) return { level: 'No Contact', color: 'error' };
    
    const recentCommunications = cadetCommunications.filter(c => {
      const commDate = new Date(c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return commDate >= thirtyDaysAgo;
    });

    if (recentCommunications.length >= 4) return { level: 'High Engagement', color: 'success' };
    if (recentCommunications.length >= 2) return { level: 'Good Contact', color: 'info' };
    if (recentCommunications.length >= 1) return { level: 'Limited Contact', color: 'warning' };
    return { level: 'No Recent Contact', color: 'error' };
  };

  const generateAutoMessage = (cadet, messageType) => {
    const templates = {
      progress: `Dear ${cadet.first_name}'s family,\n\nI wanted to update you on ${cadet.first_name}'s progress at YCA. They have been showing great improvement in their academic work and behavior. Please feel free to contact me if you have any questions.\n\nBest regards,\n[Your Name]`,
      concern: `Dear ${cadet.first_name}'s family,\n\nI wanted to touch base regarding ${cadet.first_name}. We've noticed some areas where additional support might be beneficial. I'd love to discuss this with you at your convenience.\n\nBest regards,\n[Your Name]`,
      achievement: `Dear ${cadet.first_name}'s family,\n\nI'm excited to share that ${cadet.first_name} has achieved a significant milestone! Their dedication and hard work are truly paying off.\n\nBest regards,\n[Your Name]`
    };
    
    setNewCommunication(prev => ({
      ...prev,
      cadet_id: cadet.id,
      subject: `${cadet.first_name} - ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} Update`,
      message: templates[messageType] || templates.progress
    }));
    setOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <FamilyIcon sx={{ mr: 2 }} />
          Family Communications
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          New Communication
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Communication History" icon={<HistoryIcon />} />
        <Tab label="Family Engagement" icon={<FamilyIcon />} />
        <Tab label="Quick Actions" icon={<SendIcon />} />
      </Tabs>

      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Communications
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Cadet</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Follow-up</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {communications
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 20)
                    .map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell>{new Date(comm.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {comm.cadet_first_name} {comm.cadet_last_name}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getMethodIcon(comm.method)}
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {comm.method.toUpperCase()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{comm.recipient_type}</TableCell>
                        <TableCell>{comm.subject}</TableCell>
                        <TableCell>
                          <Chip
                            label={comm.priority}
                            color={getPriorityColor(comm.priority)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={comm.status || 'sent'}
                            color={comm.status === 'delivered' ? 'success' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {comm.follow_up_required && (
                            <Chip
                              label={comm.follow_up_date}
                              color="warning"
                              size="small"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {cadets.map((cadet) => {
            const engagement = getEngagementLevel(cadet.id);
            const recentComms = communications
              .filter(c => c.cadet_id === cadet.id)
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 3);

            return (
              <Grid item xs={12} md={6} lg={4} key={cadet.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ mr: 2 }}>
                        {cadet.first_name[0]}{cadet.last_name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {cadet.first_name} {cadet.last_name}
                        </Typography>
                        <Chip
                          label={engagement.level}
                          color={engagement.color}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Recent Communications:
                    </Typography>
                    {recentComms.length > 0 ? (
                      recentComms.map((comm, index) => (
                        <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                          • {new Date(comm.created_at).toLocaleDateString()} - {comm.subject}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No recent communications
                      </Typography>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => generateAutoMessage(cadet, 'progress')}
                      >
                        Progress Update
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => generateAutoMessage(cadet, 'concern')}
                      >
                        Concern
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  📧 Bulk Email Templates
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button variant="outlined" fullWidth>
                    Weekly Progress Reports
                  </Button>
                  <Button variant="outlined" fullWidth>
                    Graduation Ceremony Invitation
                  </Button>
                  <Button variant="outlined" fullWidth>
                    Parent Conference Scheduling
                  </Button>
                  <Button variant="outlined" fullWidth>
                    Holiday Schedule Notice
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  🚨 Automated Alerts
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Psychology Integration: Automated communications reduce family anxiety and 
                  build trust through consistent updates.
                </Alert>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button variant="outlined" fullWidth color="error">
                    Behavioral Incident Notifications
                  </Button>
                  <Button variant="outlined" fullWidth color="warning">
                    Academic Concern Alerts
                  </Button>
                  <Button variant="outlined" fullWidth color="success">
                    Achievement Celebrations
                  </Button>
                  <Button variant="outlined" fullWidth color="info">
                    Appointment Reminders
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Send Communication</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Cadet</InputLabel>
                  <Select
                    value={newCommunication.cadet_id}
                    onChange={(e) => setNewCommunication({...newCommunication, cadet_id: e.target.value})}
                    required
                  >
                    {cadets.map((cadet) => (
                      <MenuItem key={cadet.id} value={cadet.id}>
                        {cadet.first_name} {cadet.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Method</InputLabel>
                  <Select
                    value={newCommunication.method}
                    onChange={(e) => setNewCommunication({...newCommunication, method: e.target.value})}
                    required
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="phone">Phone Call</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Recipient</InputLabel>
                  <Select
                    value={newCommunication.recipient_type}
                    onChange={(e) => setNewCommunication({...newCommunication, recipient_type: e.target.value})}
                    required
                  >
                    <MenuItem value="parent">Parent/Guardian</MenuItem>
                    <MenuItem value="emergency_contact">Emergency Contact</MenuItem>
                    <MenuItem value="family">Extended Family</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={newCommunication.priority}
                    onChange={(e) => setNewCommunication({...newCommunication, priority: e.target.value})}
                  >
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recipient Contact"
                  value={newCommunication.recipient_contact}
                  onChange={(e) => setNewCommunication({...newCommunication, recipient_contact: e.target.value})}
                  placeholder="Email or phone number"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={newCommunication.subject}
                  onChange={(e) => setNewCommunication({...newCommunication, subject: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Message"
                  value={newCommunication.message}
                  onChange={(e) => setNewCommunication({...newCommunication, message: e.target.value})}
                  placeholder="Enter your message..."
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth startIcon={<SendIcon />}>
                  Send Communication
                </Button>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
