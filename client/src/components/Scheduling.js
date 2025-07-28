
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  Typography,
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
  Grid,
  Chip,
  Box,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Calendar as CalendarIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const Scheduling = () => {
  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState(0); // 0: Daily, 1: Weekly, 2: Tasks
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:00',
    location: '',
    required_staff: 1
  });

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
  }, [selectedDate]);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`/api/scheduling?date=${selectedDate}`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to fetch schedules');
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError('Failed to fetch staff');
    }
  };

  const fetchAvailableStaff = async (date, startTime, endTime) => {
    try {
      const response = await axios.get('/api/scheduling/available-staff', {
        params: { date, start_time: startTime, end_time: endTime }
      });
      setAvailableStaff(response.data);
    } catch (error) {
      console.error('Error fetching available staff:', error);
      setError('Failed to fetch available staff');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentSchedule) {
        await axios.put(`/api/scheduling/${currentSchedule.id}`, formData);
        setSuccess('Schedule updated successfully');
      } else {
        await axios.post('/api/scheduling', formData);
        setSuccess('Schedule created successfully');
      }
      setOpen(false);
      setCurrentSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Failed to save schedule');
    }
  };

  const handleEdit = (schedule) => {
    setCurrentSchedule(schedule);
    setFormData({
      task_name: schedule.task_name,
      description: schedule.description || '',
      date: schedule.date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      location: schedule.location || '',
      required_staff: schedule.required_staff
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await axios.delete(`/api/scheduling/${id}`);
        setSuccess('Schedule deleted successfully');
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        setError('Failed to delete schedule');
      }
    }
  };

  const handleAssign = (schedule) => {
    setCurrentSchedule(schedule);
    setSelectedStaff(schedule.assigned_staff || []);
    fetchAvailableStaff(schedule.date, schedule.start_time, schedule.end_time);
    setAssignOpen(true);
  };

  const handleStaffAssignment = async () => {
    try {
      await axios.post(`/api/scheduling/${currentSchedule.id}/assign`, {
        staff_ids: selectedStaff
      });
      setSuccess('Staff assigned successfully');
      setAssignOpen(false);
      setCurrentSchedule(null);
      setSelectedStaff([]);
      fetchSchedules();
    } catch (error) {
      console.error('Error assigning staff:', error);
      setError('Failed to assign staff');
    }
  };

  const resetForm = () => {
    setFormData({
      task_name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '09:00',
      location: '',
      required_staff: 1
    });
  };

  const getWeekDates = () => {
    const current = new Date(selectedDate);
    const week = [];
    const startOfWeek = current.getDate() - current.getDay();
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(current.setDate(startOfWeek + i));
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => schedule.date === date);
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TaskCard = ({ schedule }) => (
    <Card sx={{ mb: 1, border: schedule.status === 'assigned' ? '2px solid #4caf50' : '1px solid #e0e0e0' }}>
      <CardContent sx={{ py: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" fontWeight="bold">
              {schedule.task_name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" display="block">
              {schedule.location || 'No location'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Needs {schedule.required_staff} staff
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {schedule.assigned_staff?.map(staffId => (
                <Chip
                  key={staffId}
                  label={getStaffName(staffId)}
                  size="small"
                  color="primary"
                  icon={<PersonIcon />}
                />
              )) || <Chip label="Unassigned" size="small" variant="outlined" />}
            </Box>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" onClick={() => handleAssign(schedule)}>
                <AssignmentIcon />
              </IconButton>
              <IconButton size="small" onClick={() => handleEdit(schedule)}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" onClick={() => handleDelete(schedule.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon /> Staff Scheduling
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setCurrentSchedule(null);
            resetForm();
            setOpen(true);
          }}
        >
          Add Task
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          label="Selected Date"
          InputLabelProps={{ shrink: true }}
        />
        <Tabs value={view} onChange={(e, newValue) => setView(newValue)}>
          <Tab label="Daily View" />
          <Tab label="Weekly View" />
          <Tab label="All Tasks" />
        </Tabs>
      </Box>

      {/* Daily View */}
      {view === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon />
              Schedule for {new Date(selectedDate).toLocaleDateString()}
            </Typography>
            {getSchedulesForDate(selectedDate).length === 0 ? (
              <Typography color="textSecondary">No tasks scheduled for this day</Typography>
            ) : (
              getSchedulesForDate(selectedDate).map(schedule => (
                <TaskCard key={schedule.id} schedule={schedule} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly View */}
      {view === 1 && (
        <Grid container spacing={2}>
          {getWeekDates().map(date => (
            <Grid item xs={12} md={6} lg={4} key={date}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Typography>
                  {getSchedulesForDate(date).length === 0 ? (
                    <Typography variant="caption" color="textSecondary">No tasks</Typography>
                  ) : (
                    getSchedulesForDate(date).map(schedule => (
                      <Box key={schedule.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" fontWeight="bold">
                          {schedule.task_name}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {schedule.assigned_staff?.length || 0}/{schedule.required_staff} staff
                        </Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* All Tasks View */}
      {view === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>All Upcoming Tasks</Typography>
            {schedules.length === 0 ? (
              <Typography color="textSecondary">No tasks scheduled</Typography>
            ) : (
              schedules.map(schedule => (
                <Accordion key={schedule.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="subtitle1">{schedule.task_name}</Typography>
                      <Typography variant="caption">
                        {new Date(schedule.date).toLocaleDateString()} • {formatTime(schedule.start_time)}
                      </Typography>
                      <Chip
                        label={schedule.status}
                        size="small"
                        color={schedule.status === 'assigned' ? 'success' : 'default'}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TaskCard schedule={schedule} />
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Task Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {currentSchedule ? 'Edit Task' : 'Add New Task'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Task Name"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="Start Time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="End Time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Required Staff"
                  value={formData.required_staff}
                  onChange={(e) => setFormData({ ...formData, required_staff: parseInt(e.target.value) })}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {currentSchedule ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Staff to: {currentSchedule?.task_name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Available Staff for {currentSchedule?.date} ({formatTime(currentSchedule?.start_time || '')} - {formatTime(currentSchedule?.end_time || '')})
          </Typography>
          <List>
            {availableStaff.map(staffMember => (
              <ListItem key={staffMember.id}>
                <ListItemText
                  primary={`${staffMember.first_name} ${staffMember.last_name}`}
                  secondary={staffMember.role}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant={selectedStaff.includes(staffMember.id) ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      if (selectedStaff.includes(staffMember.id)) {
                        setSelectedStaff(prev => prev.filter(id => id !== staffMember.id));
                      } else {
                        setSelectedStaff(prev => [...prev, staffMember.id]);
                      }
                    }}
                  >
                    {selectedStaff.includes(staffMember.id) ? 'Remove' : 'Assign'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          
          {selectedStaff.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Staff:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedStaff.map(staffId => {
                  const staffMember = staff.find(s => s.id === staffId);
                  return (
                    <Chip
                      key={staffId}
                      label={staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown'}
                      onDelete={() => setSelectedStaff(prev => prev.filter(id => id !== staffId))}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button onClick={handleStaffAssignment} variant="contained">
            Assign Staff ({selectedStaff.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Scheduling;
