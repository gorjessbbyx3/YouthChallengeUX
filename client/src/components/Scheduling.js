
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
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export const Scheduling = () => {
  const [staff, setStaff] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [conflicts, setConflicts] = useState([]);
  const [reminders, setReminders] = useState([]);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    requiredStaff: 1,
    priority: 'medium',
    category: 'supervision',
    assignedStaff: []
  });

  const taskCategories = [
    { value: 'hiset', label: 'HiSET Classes' },
    { value: 'physical', label: 'Physical Training' },
    { value: 'supervision', label: 'Cadet Supervision' },
    { value: 'community', label: 'Community Service' },
    { value: 'counseling', label: 'Counseling' },
    { value: 'admin', label: 'Administrative' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: '#4caf50' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'high', label: 'High', color: '#f44336' },
    { value: 'critical', label: 'Critical', color: '#9c27b0' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, tasksRes, schedulesRes] = await Promise.all([
        axios.get('/api/staff'),
        axios.get('/api/scheduling/tasks'),
        axios.get('/api/scheduling/schedules')
      ]);
      
      setStaff(staffRes.data);
      setTasks(tasksRes.data);
      setSchedules(schedulesRes.data);
      
      // Check for conflicts
      await checkScheduleConflicts();
    } catch (error) {
      console.error('Error fetching scheduling data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkScheduleConflicts = async () => {
    try {
      const response = await axios.get('/api/scheduling/conflicts');
      setConflicts(response.data);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleCreateTask = async () => {
    try {
      setLoading(true);
      
      // Auto-assign available staff
      const suggestedStaff = await suggestStaffAssignment();
      const taskData = {
        ...newTask,
        assignedStaff: suggestedStaff
      };
      
      await axios.post('/api/scheduling/tasks', taskData);
      
      // Send notifications
      await sendTaskNotifications(taskData);
      
      setOpenDialog(false);
      setNewTask({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        requiredStaff: 1,
        priority: 'medium',
        category: 'supervision',
        assignedStaff: []
      });
      
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestStaffAssignment = async () => {
    try {
      const response = await axios.post('/api/scheduling/suggest', {
        startTime: newTask.startTime,
        endTime: newTask.endTime,
        requiredStaff: newTask.requiredStaff,
        category: newTask.category
      });
      return response.data.suggestedStaff;
    } catch (error) {
      console.error('Error getting staff suggestions:', error);
      return [];
    }
  };

  const sendTaskNotifications = async (task) => {
    try {
      await axios.post('/api/scheduling/notifications', {
        taskId: task.id,
        assignedStaff: task.assignedStaff,
        taskDetails: task
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const getEventColor = (category, priority) => {
    const categoryColors = {
      hiset: '#2196f3',
      physical: '#4caf50',
      supervision: '#ff9800',
      community: '#9c27b0',
      counseling: '#607d8b',
      admin: '#795548'
    };
    
    const priorityIntensity = {
      low: 0.6,
      medium: 0.8,
      high: 1.0,
      critical: 1.0
    };
    
    const baseColor = categoryColors[category] || '#9e9e9e';
    const intensity = priorityIntensity[priority] || 0.8;
    
    return `${baseColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
  };

  const calendarEvents = tasks.map(task => ({
    id: task.id,
    title: `${task.title} (${task.assignedStaff?.length || 0}/${task.requiredStaff})`,
    start: new Date(task.startTime),
    end: new Date(task.endTime),
    resource: task
  }));

  const CustomEvent = ({ event }) => {
    const task = event.resource;
    const isUnderStaffed = (task.assignedStaff?.length || 0) < task.requiredStaff;
    
    return (
      <div style={{ 
        backgroundColor: getEventColor(task.category, task.priority),
        color: 'white',
        padding: '2px 4px',
        borderRadius: '4px',
        fontSize: '12px',
        border: isUnderStaffed ? '2px solid #f44336' : 'none'
      }}>
        <div style={{ fontWeight: 'bold' }}>{task.title}</div>
        <div style={{ fontSize: '10px' }}>
          {task.assignedStaff?.length || 0}/{task.requiredStaff} staff
          {isUnderStaffed && <WarningIcon style={{ fontSize: '12px', marginLeft: '4px' }} />}
        </div>
      </div>
    );
  };

  const WeeklyView = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Weekly Schedule</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Task
        </Button>
      </Box>
      
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        views={['week', 'day']}
        defaultView="week"
        components={{
          event: CustomEvent
        }}
        onSelectEvent={(event) => {
          // Handle event selection
          console.log('Selected event:', event);
        }}
      />
    </Box>
  );

  const StaffAvailabilityView = () => (
    <Grid container spacing={2}>
      {staff.map(member => (
        <Grid item xs={12} md={6} key={member.id}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h6">{member.name}</Typography>
                <Chip 
                  label={member.role} 
                  size="small" 
                  sx={{ ml: 2 }}
                  color={member.available ? 'success' : 'default'}
                />
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>
                Current Assignments Today:
              </Typography>
              
              <List dense>
                {tasks
                  .filter(task => 
                    task.assignedStaff?.includes(member.id) &&
                    moment(task.startTime).isSame(moment(), 'day')
                  )
                  .map(task => (
                    <ListItem key={task.id}>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={`${moment(task.startTime).format('HH:mm')} - ${moment(task.endTime).format('HH:mm')}`}
                      />
                    </ListItem>
                  ))
                }
              </List>
              
              {member.weeklyHours && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Weekly Hours: {member.weeklyHours.current || 0}/{member.weeklyHours.max || 40}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const ConflictsAndAlertsView = () => (
    <Box>
      {conflicts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {conflicts.length} schedule conflict(s) detected. Please review assignments.
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Schedule Conflicts
              </Typography>
              
              {conflicts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography color="text.secondary">
                    No conflicts detected
                  </Typography>
                </Box>
              ) : (
                <List>
                  {conflicts.map((conflict, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`${conflict.staffName} - Double Booking`}
                        secondary={`${conflict.task1} conflicts with ${conflict.task2} on ${moment(conflict.date).format('MMM DD, YYYY')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Upcoming Reminders
              </Typography>
              
              <List>
                {tasks
                  .filter(task => moment(task.startTime).isAfter(moment()) && moment(task.startTime).isBefore(moment().add(24, 'hours')))
                  .slice(0, 5)
                  .map(task => (
                    <ListItem key={task.id}>
                      <ListItemIcon>
                        <TimeIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={`Tomorrow at ${moment(task.startTime).format('HH:mm')} - ${task.assignedStaff?.length || 0} staff assigned`}
                      />
                    </ListItem>
                  ))
                }
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Staff Scheduling
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage staff schedules, assignments, and availability across all YCA activities
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<CalendarIcon />} label="Weekly Schedule" />
          <Tab icon={<PersonIcon />} label="Staff Availability" />
          <Tab icon={<WarningIcon />} label="Conflicts & Alerts" />
        </Tabs>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {tabValue === 0 && <WeeklyView />}
          {tabValue === 1 && <StaffAvailabilityView />}
          {tabValue === 2 && <ConflictsAndAlertsView />}
        </>
      )}

      {/* Create Task Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Task Title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTask.category}
                  onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                >
                  {taskCategories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Start Time"
                value={newTask.startTime}
                onChange={(e) => setNewTask({...newTask, startTime: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="End Time"
                value={newTask.endTime}
                onChange={(e) => setNewTask({...newTask, endTime: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Required Staff"
                value={newTask.requiredStaff}
                onChange={(e) => setNewTask({...newTask, requiredStaff: parseInt(e.target.value)})}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: priority.color,
                            mr: 1
                          }}
                        />
                        {priority.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained"
            disabled={!newTask.title || !newTask.startTime || !newTask.endTime}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
