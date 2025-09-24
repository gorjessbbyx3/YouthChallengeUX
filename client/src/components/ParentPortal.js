
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  EmojiEvents as BadgeIcon,
  Volunteer as ServiceIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import axios from 'axios';

const ParentPortal = ({ parentId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageDialog, setMessageDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (parentId) {
      fetchDashboardData();
      fetchMilestones();
    }
  }, [parentId]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`/api/parents/dashboard/${parentId}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      if (dashboardData?.cadet?.id) {
        const response = await axios.get(`/api/milestones/cadet/${dashboardData.cadet.id}`);
        setMilestones(response.data);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const sendMessage = async () => {
    try {
      await axios.post('/api/communications', {
        cadet_id: dashboardData.cadet.id,
        recipient_type: 'staff',
        method: 'email',
        subject: `Message from ${dashboardData.parent.first_name} ${dashboardData.parent.last_name}`,
        message: newMessage,
        priority: 'normal'
      });
      setMessageDialog(false);
      setNewMessage('');
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message.');
    }
  };

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Unable to load parent dashboard data</Alert>
      </Box>
    );
  }

  const { parent, cadet, recent_activities } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Parent Portal - {cadet.first_name} {cadet.last_name}
      </Typography>

      <Grid container spacing={3}>
        {/* Cadet Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, width: 60, height: 60 }}>
                  {cadet.first_name[0]}{cadet.last_name[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {cadet.first_name} {cadet.last_name}
                  </Typography>
                  <Typography color="text.secondary">
                    Platoon: {cadet.platoon} | Rank: {cadet.rank}
                  </Typography>
                  <Chip 
                    label={cadet.status} 
                    color="primary" 
                    size="small" 
                  />
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Behavior Score: {cadet.behavior_score}/5
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(cadet.behavior_score / 5) * 100}
                  color={cadet.behavior_score >= 4 ? 'success' : cadet.behavior_score >= 3 ? 'primary' : 'warning'}
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<MessageIcon />}
                onClick={() => setMessageDialog(true)}
                fullWidth
              >
                Send Message to Staff
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Academic Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Academic Progress
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">HiSET Status</Typography>
                <Chip 
                  label={cadet.hiset_status || 'Not Started'}
                  color={cadet.hiset_status === 'completed' ? 'success' : 'primary'}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Placement Status</Typography>
                <Chip 
                  label={cadet.placement_status || 'Active'}
                  color={cadet.placement_status === 'workforce' ? 'success' : 'primary'}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Enrolled: {new Date(cadet.enrollment_date).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Milestones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BadgeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Achievements
              </Typography>
              
              {milestones.length > 0 ? (
                <List>
                  {milestones.slice(0, 5).map((milestone) => (
                    <ListItem key={milestone.id}>
                      <ListItemIcon>
                        <BadgeIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={milestone.milestone_type}
                        secondary={new Date(milestone.earned_at).toLocaleDateString()}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No milestones earned yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ServiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Activities
              </Typography>
              
              {recent_activities.length > 0 ? (
                <List>
                  {recent_activities.slice(0, 5).map((activity) => (
                    <ListItem key={activity.id}>
                      <ListItemText
                        primary={activity.title}
                        secondary={`${activity.activity_type} - ${new Date(activity.completed_at).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No recent activities recorded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Message Dialog */}
      <Dialog open={messageDialog} onClose={() => setMessageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Message to Staff</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Enter your message here..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => setMessageDialog(false)}>Cancel</Button>
          <Button onClick={sendMessage} variant="contained" disabled={!newMessage.trim()}>
            Send Message
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ParentPortal;
