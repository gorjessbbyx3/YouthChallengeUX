
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
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  EmojiEvents as BadgeIcon,
  Add as AddIcon,
  Star as StarIcon
} from '@mui/icons-material';
import axios from 'axios';

const BadgeSystem = () => {
  const [milestones, setMilestones] = useState([]);
  const [milestoneTypes, setMilestoneTypes] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [awardDialog, setAwardDialog] = useState(false);
  const [selectedCadet, setSelectedCadet] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchMilestoneTypes();
    fetchCadets();
    fetchRecentMilestones();
  }, []);

  const fetchMilestoneTypes = async () => {
    try {
      const response = await axios.get('/api/milestones/types');
      setMilestoneTypes(response.data);
    } catch (error) {
      console.error('Error fetching milestone types:', error);
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

  const fetchRecentMilestones = async () => {
    try {
      // This would typically fetch recent milestones across all cadets
      setMilestones([]);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const awardMilestone = async () => {
    try {
      await axios.post('/api/milestones/award', {
        cadet_id: selectedCadet,
        milestone_type: milestoneTypes.find(mt => mt.id === selectedMilestone)?.name,
        notes,
        awarded_by: 'current_user' // Replace with actual user ID
      });

      setAwardDialog(false);
      setSelectedCadet('');
      setSelectedMilestone('');
      setNotes('');
      fetchRecentMilestones();
      alert('Milestone awarded successfully!');
    } catch (error) {
      console.error('Error awarding milestone:', error);
      alert('Failed to award milestone.');
    }
  };

  const getMilestoneColor = (milestoneType) => {
    const colors = {
      'Academic Excellence': '#4CAF50',
      'Leadership': '#2196F3',
      'Community Service': '#FF9800',
      'Behavioral Improvement': '#9C27B0',
      'Graduation Ready': '#F44336'
    };
    return colors[milestoneType] || '#757575';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <BadgeIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Badge & Milestone System
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAwardDialog(true)}
        >
          Award Milestone
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Milestone Types */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Available Milestones</Typography>
          <Grid container spacing={2}>
            {milestoneTypes.map((milestone) => (
              <Grid item xs={12} md={6} lg={4} key={milestone.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: getMilestoneColor(milestone.name), mr: 2 }}>
                        <StarIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{milestone.name}</Typography>
                        <Chip 
                          label={`${milestone.points} points`} 
                          size="small" 
                          color="primary" 
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {milestone.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Recent Awards */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Awards</Typography>
              {milestones.length > 0 ? (
                <List>
                  {milestones.map((milestone) => (
                    <ListItem key={milestone.id}>
                      <ListItemIcon>
                        <BadgeIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${milestone.cadet_name} - ${milestone.milestone_type}`}
                        secondary={`Awarded on ${new Date(milestone.earned_at).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No recent milestones awarded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Award Dialog */}
      <Dialog open={awardDialog} onClose={() => setAwardDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Award Milestone</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Cadet</InputLabel>
                <Select
                  value={selectedCadet}
                  onChange={(e) => setSelectedCadet(e.target.value)}
                >
                  {cadets.map((cadet) => (
                    <MenuItem key={cadet.id} value={cadet.id}>
                      {cadet.first_name} {cadet.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Milestone</InputLabel>
                <Select
                  value={selectedMilestone}
                  onChange={(e) => setSelectedMilestone(e.target.value)}
                >
                  {milestoneTypes.map((milestone) => (
                    <MenuItem key={milestone.id} value={milestone.id}>
                      {milestone.name} ({milestone.points} points)
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
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this achievement..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAwardDialog(false)}>Cancel</Button>
          <Button 
            onClick={awardMilestone} 
            variant="contained"
            disabled={!selectedCadet || !selectedMilestone}
          >
            Award Milestone
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BadgeSystem;
