
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
      // Get cadet risk information for smart scheduling
      const cadetsResponse = await axios.get('/api/cadets');
      const cadets = cadetsResponse.data;
      const highRiskCount = cadets.filter(c => c.behavior_score <= 2).length;
      
      const tasks = [
        { 
          name: 'Morning Drill', 
          time: '06:00', 
          required_staff: 2, 
          requires_experience: true,
          high_risk_cadets: highRiskCount > 0,
          priority: 'high'
        },
        { 
          name: 'HiSET Classes', 
          time: '09:00', 
          required_staff: Math.max(2, Math.ceil(cadets.length / 15)), 
          requires_experience: false,
          priority: 'high'
        },
        { 
          name: 'Community Service', 
          time: '14:00', 
          required_staff: 2, 
          requires_experience: false,
          priority: 'medium'
        },
        { 
          name: 'Evening Supervision', 
          time: '18:00', 
          required_staff: Math.max(1, Math.ceil(highRiskCount / 5)), 
          requires_experience: true,
          high_risk_cadets: true,
          priority: 'high'
        },
        { 
          name: 'Mentorship Sessions', 
          time: '15:30', 
          required_staff: Math.min(3, Math.ceil(cadets.length / 20)), 
          requires_experience: true,
          priority: 'medium'
        }
      ];
      
      const response = await axios.post('/api/scheduling/optimize', {
        date: new Date().toISOString().split('T')[0],
        tasks
      });
      
      setOptimizedResult(response.data);
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      setOptimizedResult({
        error: 'AI optimization failed. Please try manual scheduling.',
        recommendations: ['Check staff availability', 'Ensure adequate experienced staff coverage']
      });
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
        <Alert severity={optimizedResult.error ? "warning" : "success"} sx={{ mb: 3 }}>
          <Typography variant="h6">
            {optimizedResult.error ? "⚠️ Scheduling Issue" : "🤖 AI Schedule Optimization Results"}
          </Typography>
          
          {optimizedResult.ai_metadata && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                📊 Analysis: {optimizedResult.ai_metadata.total_staff_analyzed} staff • 
                {optimizedResult.ai_metadata.high_risk_cadets} high-risk cadets • 
                {optimizedResult.ai_metadata.optimization_confidence}% confidence
              </Typography>
            </Box>
          )}

          {optimizedResult.optimized_schedule && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Suggested Assignments:</Typography>
              {optimizedResult.optimized_schedule.map((assignment, index) => (
                <Box key={index} sx={{ ml: 2, mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {assignment.task} ({assignment.time})
                  </Typography>
                  {assignment.assigned_staff.map((staff, staffIndex) => (
                    <Typography key={staffIndex} variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                      → {staff.name} ({staff.experience_years}yr exp, 
                      {staff.ai_score ? ` ${(staff.ai_score * 100).toFixed(0)}% match` : ''})
                    </Typography>
                  ))}
                  {assignment.assignment_rationale && assignment.assignment_rationale.length > 0 && (
                    <Typography variant="caption" sx={{ ml: 2, fontStyle: 'italic', color: 'primary.main' }}>
                      💡 {assignment.assignment_rationale[0]}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2 }}>Recommendations:</Typography>
          {optimizedResult.recommendations.map((rec, index) => (
            <Typography key={index} variant="body2" sx={{ ml: 1 }}>• {rec}</Typography>
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
