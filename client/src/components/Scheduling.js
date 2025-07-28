
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
  Alert
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  AutoAwesome as AIIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';

export const Scheduling = () => {
  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState(null);
  const [newSchedule, setNewSchedule] = useState({
    staff_id: '',
    date: '',
    start_time: '',
    end_time: '',
    task_type: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get('/api/scheduling');
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
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
      await axios.post('/api/scheduling', newSchedule);
      setOpen(false);
      setNewSchedule({
        staff_id: '',
        date: '',
        start_time: '',
        end_time: '',
        task_type: '',
        location: '',
        notes: ''
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const optimizeSchedule = async () => {
    setOptimizing(true);
    try {
      const tasks = [
        { name: 'Morning Drill', time: '06:00', required_staff: 2, requires_experience: true },
        { name: 'HiSET Classes', time: '09:00', required_staff: 3, requires_experience: false },
        { name: 'Community Service', time: '14:00', required_staff: 2, requires_experience: false },
        { name: 'Evening Supervision', time: '18:00', required_staff: 1, requires_experience: true }
      ];
      
      const response = await axios.post('/api/scheduling/optimize', {
        date: new Date().toISOString().split('T')[0],
        tasks
      });
      
      setOptimizedResult(response.data);
    } catch (error) {
      console.error('Error optimizing schedule:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const taskTypeColors = {
    'drill': 'primary',
    'class': 'success',
    'service': 'warning',
    'supervision': 'error'
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Staff Scheduling</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AIIcon />}
            onClick={optimizeSchedule}
            disabled={optimizing}
            sx={{ mr: 2 }}
          >
            {optimizing ? 'Optimizing...' : 'AI Optimize'}
          </Button>
          <Button
            variant="contained"
            startIcon={<ScheduleIcon />}
            onClick={() => setOpen(true)}
          >
            Add Schedule
          </Button>
        </Box>
      </Box>

      {optimizedResult && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6">AI Schedule Optimization Results</Typography>
          {optimizedResult.recommendations.map((rec, index) => (
            <Typography key={index} variant="body2">• {rec}</Typography>
          ))}
        </Alert>
      )}

      <Grid container spacing={3}>
        {schedules.map((schedule) => (
          <Grid item xs={12} md={6} lg={4} key={schedule.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    {schedule.staff_name} {schedule.staff_last_name}
                  </Typography>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {schedule.date}
                </Typography>
                <Typography variant="body2">
                  {schedule.start_time} - {schedule.end_time}
                </Typography>
                <Chip
                  label={schedule.task_type}
                  color={taskTypeColors[schedule.task_type] || 'default'}
                  size="small"
                  sx={{ mt: 1 }}
                />
                {schedule.location && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    📍 {schedule.location}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Schedule</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Staff Member</InputLabel>
                  <Select
                    value={newSchedule.staff_id}
                    onChange={(e) => setNewSchedule({...newSchedule, staff_id: e.target.value})}
                    required
                  >
                    {staff.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Start Time"
                  value={newSchedule.start_time}
                  onChange={(e) => setNewSchedule({...newSchedule, start_time: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="End Time"
                  value={newSchedule.end_time}
                  onChange={(e) => setNewSchedule({...newSchedule, end_time: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Task Type</InputLabel>
                  <Select
                    value={newSchedule.task_type}
                    onChange={(e) => setNewSchedule({...newSchedule, task_type: e.target.value})}
                    required
                  >
                    <MenuItem value="drill">Morning Drill</MenuItem>
                    <MenuItem value="class">HiSET Classes</MenuItem>
                    <MenuItem value="service">Community Service</MenuItem>
                    <MenuItem value="supervision">Supervision</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  value={newSchedule.location}
                  onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={newSchedule.notes}
                  onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth>
                  Create Schedule
                </Button>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
