
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  People as MentorshipIcon,
  PersonAdd as AddMentorIcon,
  TrendingUp as ProgressIcon,
  Assignment as GoalIcon,
  Chat as ChatIcon,
  Calendar as CalendarIcon,
  Star as StarIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { MentorshipCreate } from './MentorshipCreate';
import { MentorshipList } from './MentorshipList';
import axios from 'axios';

export const Mentorship = () => {
  const [mentorships, setMentorships] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedMentorship, setSelectedMentorship] = useState(null);
  const [progressDialog, setProgressDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mentorshipsRes, cadetsRes, staffRes] = await Promise.all([
        axios.get('/api/mentorship'),
        axios.get('/api/cadets'),
        axios.get('/api/staff')
      ]);
      
      setMentorships(mentorshipsRes.data);
      setCadets(cadetsRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'paused': return 'warning';
      case 'terminated': return 'error';
      default: return 'default';
    }
  };

  const calculateProgress = (mentorship) => {
    if (!mentorship.goals) return 0;
    const totalGoals = mentorship.goals.length;
    const completedGoals = mentorship.goals.filter(g => g.completed).length;
    return totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  };

  const getMentorshipStats = () => {
    const active = mentorships.filter(m => m.status === 'active').length;
    const completed = mentorships.filter(m => m.status === 'completed').length;
    const avgProgress = mentorships.reduce((sum, m) => sum + calculateProgress(m), 0) / mentorships.length || 0;
    
    return { active, completed, avgProgress };
  };

  const stats = getMentorshipStats();

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <MentorshipIcon sx={{ mr: 2 }} />
          Mentorship Program
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddMentorIcon />}
          onClick={() => setCreateDialog(true)}
        >
          Create Mentorship
        </Button>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
              <Typography variant="body2" color="text.secondary">Active Mentorships</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary.main">{stats.completed}</Typography>
              <Typography variant="body2" color="text.secondary">Completed Programs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">{stats.avgProgress.toFixed(0)}%</Typography>
              <Typography variant="body2" color="text.secondary">Average Progress</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {cadets.filter(c => !mentorships.some(m => m.cadet_id === c.id && m.status === 'active')).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Unmatched Cadets</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Active Mentorships" icon={<Badge badgeContent={stats.active} color="success"><MentorshipIcon /></Badge>} />
        <Tab label="Progress Tracking" icon={<ProgressIcon />} />
        <Tab label="Goal Management" icon={<GoalIcon />} />
        <Tab label="Program Analytics" icon={<StarIcon />} />
      </Tabs>

      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Active Mentorship Relationships</Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cadet</TableCell>
                    <TableCell>Mentor</TableCell>
                    <TableCell>Program Type</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mentorships
                    .filter(m => m.status === 'active')
                    .map((mentorship) => {
                      const cadet = cadets.find(c => c.id === mentorship.cadet_id);
                      const mentor = staff.find(s => s.id === mentorship.mentor_id);
                      const progress = calculateProgress(mentorship);
                      
                      return (
                        <TableRow key={mentorship.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                                {cadet?.first_name?.charAt(0)}
                              </Avatar>
                              {cadet ? `${cadet.first_name} ${cadet.last_name}` : 'Unknown'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                                {mentor?.first_name?.charAt(0)}
                              </Avatar>
                              {mentor ? `${mentor.first_name} ${mentor.last_name}` : 'Unassigned'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={mentorship.program_type} size="small" />
                          </TableCell>
                          <TableCell>
                            {new Date(mentorship.start_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={progress} 
                                sx={{ width: 60 }}
                              />
                              <Typography variant="body2">{progress.toFixed(0)}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={mentorship.status} 
                              size="small" 
                              color={getStatusColor(mentorship.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSelectedMentorship(mentorship);
                                setProgressDialog(true);
                              }}
                            >
                              <ProgressIcon />
                            </IconButton>
                            <IconButton size="small">
                              <ChatIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Progress Overview</Typography>
                
                {mentorships
                  .filter(m => m.status === 'active')
                  .map((mentorship) => {
                    const cadet = cadets.find(c => c.id === mentorship.cadet_id);
                    const progress = calculateProgress(mentorship);
                    
                    return (
                      <Box key={mentorship.id} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1">
                            {cadet?.first_name} {cadet?.last_name} - {mentorship.program_type}
                          </Typography>
                          <Chip label={`${progress.toFixed(0)}% Complete`} color="primary" />
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          sx={{ mb: 2, height: 8, borderRadius: 4 }}
                        />
                        
                        {mentorship.goals && (
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Goals Progress:
                            </Typography>
                            <List dense>
                              {mentorship.goals.slice(0, 3).map((goal, index) => (
                                <ListItem key={index} disablePadding>
                                  <ListItemAvatar>
                                    <Avatar sx={{ width: 24, height: 24, bgcolor: goal.completed ? 'success.main' : 'grey.300' }}>
                                      <CheckIcon sx={{ fontSize: 16 }} />
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText 
                                    primary={goal.title}
                                    secondary={goal.deadline}
                                    sx={{ 
                                      textDecoration: goal.completed ? 'line-through' : 'none',
                                      opacity: goal.completed ? 0.7 : 1
                                    }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>This Week's Activities</Typography>
                
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <CalendarIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="3 Mentorship Sessions"
                      secondary="Scheduled for this week"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <GoalIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="5 Goal Reviews"
                      secondary="Due for completion"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <ProgressIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="2 Progress Reports"
                      secondary="Ready for review"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Program Impact</Typography>
                
                <Alert severity="success" sx={{ mb: 2 }}>
                  Mentorship participants show 23% higher graduation rates
                </Alert>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Academic Improvement</Typography>
                    <Typography variant="body2" fontWeight="bold">+18%</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Behavioral Incidents</Typography>
                    <Typography variant="body2" fontWeight="bold">-34%</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Engagement Score</Typography>
                    <Typography variant="body2" fontWeight="bold">89/100</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Create Mentorship Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Mentorship</DialogTitle>
        <DialogContent>
          <MentorshipCreate 
            onClose={() => setCreateDialog(false)}
            onSuccess={() => {
              setCreateDialog(false);
              fetchData();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={progressDialog} onClose={() => setProgressDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Update Progress</DialogTitle>
        <DialogContent>
          {selectedMentorship && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Progress for {cadets.find(c => c.id === selectedMentorship.cadet_id)?.first_name}
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Progress Notes"
                placeholder="Enter progress updates, achievements, and observations..."
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary">
                  Save Progress
                </Button>
                <Button variant="outlined" onClick={() => setProgressDialog(false)}>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
