
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
  Rating,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import axios from 'axios';

export const BehavioralTracking = () => {
  const [cadets, setCadets] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [newBehavior, setNewBehavior] = useState({
    cadet_id: '',
    behavior_type: '',
    severity: 5,
    context: '',
    intervention: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCadets();
    fetchBehaviors();
  }, []);

  const fetchCadets = async () => {
    try {
      const response = await axios.get('/api/cadets');
      setCadets(response.data);
    } catch (error) {
      console.error('Error fetching cadets:', error);
    }
  };

  const fetchBehaviors = async () => {
    try {
      const response = await axios.get('/api/behavioral-tracking');
      setBehaviors(response.data);
    } catch (error) {
      console.error('Error fetching behaviors:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/behavioral-tracking', newBehavior);
      setOpen(false);
      setNewBehavior({
        cadet_id: '',
        behavior_type: '',
        severity: 5,
        context: '',
        intervention: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchBehaviors();
      fetchCadets(); // Refresh to update behavior scores
    } catch (error) {
      console.error('Error creating behavior record:', error);
    }
  };

  const getBehaviorTrend = (cadetId) => {
    const cadetBehaviors = behaviors
      .filter(b => b.cadet_id === cadetId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    if (cadetBehaviors.length < 2) return 'neutral';
    
    const recent = cadetBehaviors.slice(0, 2).reduce((sum, b) => sum + b.severity, 0) / 2;
    const older = cadetBehaviors.slice(2).reduce((sum, b) => sum + b.severity, 0) / (cadetBehaviors.length - 2);
    
    if (recent > older + 1) return 'improving';
    if (recent < older - 1) return 'declining';
    return 'stable';
  };

  const getPsychologyInsight = (cadet) => {
    const recentBehaviors = behaviors
      .filter(b => b.cadet_id === cadet.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    if (recentBehaviors.length === 0) return 'No recent behavioral data available';

    const avgSeverity = recentBehaviors.reduce((sum, b) => sum + b.severity, 0) / recentBehaviors.length;
    
    if (avgSeverity <= 3) {
      return `🔴 High-risk: Consider trauma-informed care approach. May benefit from attachment-based interventions and consistent staff assignment.`;
    } else if (avgSeverity <= 6) {
      return `🟡 Moderate concern: Implement positive reinforcement strategies. Consider peer mentorship and structured activities.`;
    } else {
      return `🟢 Positive trajectory: Continue current interventions. Consider leadership opportunities to build self-efficacy.`;
    }
  };

  const behaviorTypes = [
    'Aggression',
    'Defiance',
    'Withdrawal',
    'Academic Resistance',
    'Positive Leadership',
    'Cooperation',
    'Helping Others',
    'Following Rules',
    'Respect to Staff',
    'Peer Conflict'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <PsychologyIcon sx={{ mr: 2 }} />
          Behavioral Tracking & Psychology Insights
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Log Behavior
        </Button>
      </Box>

      <Grid container spacing={3}>
        {cadets.map((cadet) => {
          const trend = getBehaviorTrend(cadet.id);
          const insight = getPsychologyInsight(cadet);
          const recentBehaviors = behaviors
            .filter(b => b.cadet_id === cadet.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

          return (
            <Grid item xs={12} md={6} lg={4} key={cadet.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {cadet.first_name} {cadet.last_name}
                    </Typography>
                    <Chip
                      icon={<TimelineIcon />}
                      label={trend}
                      color={
                        trend === 'improving' ? 'success' :
                        trend === 'declining' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Behavior Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Rating
                        value={cadet.behavior_score || 5}
                        max={10}
                        readOnly
                        size="small"
                      />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {cadet.behavior_score || 5}/10
                      </Typography>
                    </Box>
                  </Box>

                  <Alert 
                    severity={
                      (cadet.behavior_score || 5) <= 3 ? 'error' :
                      (cadet.behavior_score || 5) <= 6 ? 'warning' : 'success'
                    }
                    sx={{ mb: 2, fontSize: '0.8rem' }}
                  >
                    {insight}
                  </Alert>

                  {recentBehaviors.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Recent Behaviors:
                      </Typography>
                      {recentBehaviors.map((behavior, index) => (
                        <Chip
                          key={index}
                          label={`${behavior.behavior_type} (${behavior.severity}/10)`}
                          size="small"
                          color={behavior.severity <= 3 ? 'error' : behavior.severity <= 6 ? 'warning' : 'success'}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Behavioral Incidents
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Cadet</TableCell>
                  <TableCell>Behavior</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Context</TableCell>
                  <TableCell>Intervention</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {behaviors
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map((behavior) => (
                    <TableRow key={behavior.id}>
                      <TableCell>{behavior.date}</TableCell>
                      <TableCell>
                        {behavior.cadet_first_name} {behavior.cadet_last_name}
                      </TableCell>
                      <TableCell>{behavior.behavior_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${behavior.severity}/10`}
                          color={
                            behavior.severity <= 3 ? 'error' :
                            behavior.severity <= 6 ? 'warning' : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{behavior.context}</TableCell>
                      <TableCell>{behavior.intervention}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Log Behavioral Incident</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Cadet</InputLabel>
                  <Select
                    value={newBehavior.cadet_id}
                    onChange={(e) => setNewBehavior({...newBehavior, cadet_id: e.target.value})}
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
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={newBehavior.date}
                  onChange={(e) => setNewBehavior({...newBehavior, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Behavior Type</InputLabel>
                  <Select
                    value={newBehavior.behavior_type}
                    onChange={(e) => setNewBehavior({...newBehavior, behavior_type: e.target.value})}
                    required
                  >
                    {behaviorTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Severity (1=Very Concerning, 10=Very Positive)
                  </Typography>
                  <Rating
                    value={newBehavior.severity}
                    max={10}
                    onChange={(event, newValue) => {
                      setNewBehavior({...newBehavior, severity: newValue});
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Context/Situation"
                  value={newBehavior.context}
                  onChange={(e) => setNewBehavior({...newBehavior, context: e.target.value})}
                  placeholder="What happened? Where? Who was involved?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Intervention Applied"
                  value={newBehavior.intervention}
                  onChange={(e) => setNewBehavior({...newBehavior, intervention: e.target.value})}
                  placeholder="How was the situation handled? What strategies were used?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Notes"
                  value={newBehavior.notes}
                  onChange={(e) => setNewBehavior({...newBehavior, notes: e.target.value})}
                  placeholder="Additional observations, triggers, follow-up needed, etc."
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth>
                  Log Behavior
                </Button>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
