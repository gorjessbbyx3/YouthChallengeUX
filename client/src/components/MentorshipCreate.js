
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';

export const MentorshipCreate = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    cadet_id: '',
    mentor_id: '',
    program_type: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    goals: []
  });
  const [cadets, setCadets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cadetsRes, staffRes] = await Promise.all([
        axios.get('/api/cadets'),
        axios.get('/api/staff')
      ]);
      
      setCadets(cadetsRes.data.filter(c => c.status === 'active'));
      setStaff(staffRes.data.filter(s => s.is_active));
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load cadets and staff');
    }
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setFormData({
        ...formData,
        goals: [...formData.goals, {
          title: newGoal,
          completed: false,
          deadline: '',
          priority: 'medium'
        }]
      });
      setNewGoal('');
    }
  };

  const removeGoal = (index) => {
    const updatedGoals = formData.goals.filter((_, i) => i !== index);
    setFormData({ ...formData, goals: updatedGoals });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/mentorship', formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating mentorship:', error);
      setError('Failed to create mentorship relationship');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const programTypes = [
    'Academic Support',
    'Leadership Development',
    'Career Guidance',
    'Personal Development',
    'Behavioral Support',
    'Life Skills Training'
  ];

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Cadet</InputLabel>
            <Select
              value={formData.cadet_id}
              onChange={(e) => handleInputChange('cadet_id', e.target.value)}
              label="Cadet"
            >
              {cadets.map((cadet) => (
                <MenuItem key={cadet.id} value={cadet.id}>
                  {cadet.first_name} {cadet.last_name} - {cadet.platoon || 'Unassigned'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Mentor</InputLabel>
            <Select
              value={formData.mentor_id}
              onChange={(e) => handleInputChange('mentor_id', e.target.value)}
              label="Mentor"
            >
              {staff.map((mentor) => (
                <MenuItem key={mentor.id} value={mentor.id}>
                  {mentor.first_name} {mentor.last_name} - {mentor.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Program Type</InputLabel>
            <Select
              value={formData.program_type}
              onChange={(e) => handleInputChange('program_type', e.target.value)}
              label="Program Type"
            >
              {programTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Initial Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Enter any initial observations or program objectives..."
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Mentorship Goals
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Add Goal"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Enter a mentorship goal..."
              onKeyPress={(e) => e.key === 'Enter' && addGoal()}
            />
            <Button
              variant="outlined"
              onClick={addGoal}
              startIcon={<AddIcon />}
              disabled={!newGoal.trim()}
            >
              Add
            </Button>
          </Box>

          <List>
            {formData.goals.map((goal, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={goal.title}
                  secondary={`Priority: ${goal.priority}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => removeGoal(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {formData.goals.length === 0 && (
            <Alert severity="info">
              Add goals to help track the mentorship progress and outcomes.
            </Alert>
          )}
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !formData.cadet_id || !formData.mentor_id || !formData.program_type}
        >
          {loading ? 'Creating...' : 'Create Mentorship'}
        </Button>
      </Box>
    </Box>
  );
};
