
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  LinearProgress,
  Rating,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import axios from 'axios';

const SupervisorAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ratingDialog, setRatingDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('auth');
      const response = await axios.get('/api/supervisor-assignments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const getSuggestions = async (cadetId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth');
      const response = await axios.get(`/api/supervisor-assignments/suggestions/${cadetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data.suggestions);
      setSelectedCadet(response.data.cadet);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (cadetId, staffId) => {
    try {
      const token = localStorage.getItem('auth');
      await axios.post('/api/supervisor-assignments', {
        cadet_id: cadetId,
        staff_id: staffId,
        assignment_type: 'supervision'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAssignments();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const updateEffectiveness = async () => {
    try {
      const token = localStorage.getItem('auth');
      await axios.put(`/api/supervisor-assignments/${selectedAssignment.id}/effectiveness`, {
        effectiveness_rating: rating,
        notes: notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAssignments();
      setRatingDialog(false);
      setRating(3);
      setNotes('');
    } catch (error) {
      console.error('Error updating effectiveness:', error);
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getElementColor = (element) => {
    const colors = {
      'Fire': '#ff5722',
      'Earth': '#8bc34a', 
      'Air': '#2196f3',
      'Water': '#00bcd4'
    };
    return colors[element] || '#9e9e9e';
  };

  const getRiskColor = (score) => {
    if (score >= 4) return 'error';
    if (score === 3) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        👥 Supervisor Assignments
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Attachment Theory + Astrology:</strong> Experienced staff are matched with 
          high-risk cadets using astrological compatibility to build trust and rapport. 
          Staff Sun signs complement cadet personality traits for effective mentorship.
        </Typography>
      </Alert>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Current Supervisor Assignments
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Cadet</strong></TableCell>
              <TableCell><strong>Supervisor</strong></TableCell>
              <TableCell><strong>Compatibility</strong></TableCell>
              <TableCell><strong>Experience</strong></TableCell>
              <TableCell><strong>Effectiveness</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: getElementColor(assignment.cadet_element || 'Earth'),
                      width: 32,
                      height: 32
                    }}>
                      {assignment.cadet_first_name?.[0]}{assignment.cadet_last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {assignment.cadet_first_name} {assignment.cadet_last_name}
                      </Typography>
                      <Chip 
                        label={`Behavior: ${assignment.behavior_score}`}
                        color={getRiskColor(assignment.behavior_score)}
                        size="small"
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: getElementColor(assignment.supervisor_element || 'Earth'),
                      width: 32,
                      height: 32
                    }}>
                      {assignment.supervisor_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {assignment.supervisor_name}
                      </Typography>
                      <Chip 
                        label={assignment.role}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(assignment.compatibility_score || 0.5) * 100}
                      color={getCompatibilityColor(assignment.compatibility_score || 0.5)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption">
                      {((assignment.compatibility_score || 0.5) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${assignment.experience_years}yr`}
                    color={assignment.experience_years >= 3 ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {assignment.effectiveness_rating ? (
                    <Rating 
                      value={assignment.effectiveness_rating} 
                      readOnly 
                      size="small"
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Not rated
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setRating(assignment.effectiveness_rating || 3);
                      setNotes(assignment.notes || '');
                      setRatingDialog(true);
                    }}
                  >
                    Rate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h5" gutterBottom>
        Find Supervisor Assignments
      </Typography>
      
      <Button 
        variant="outlined" 
        onClick={() => getSuggestions(1)} // Replace with actual cadet selection
        disabled={loading}
      >
        Get Supervisor Suggestions for Cadet
      </Button>

      {/* Suggestions Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Supervisor Suggestions for {selectedCadet?.first_name} {selectedCadet?.last_name}
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={`${selectedCadet?.zodiac_sign} (${selectedCadet?.element})`}
              sx={{ bgcolor: getElementColor(selectedCadet?.element), color: 'white', mr: 1 }}
            />
            <Chip 
              label={`Behavior Score: ${selectedCadet?.behavior_score}`}
              color={getRiskColor(selectedCadet?.behavior_score)}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {suggestions.map((suggestion, index) => (
            <Card key={suggestion.staff.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: getElementColor(suggestion.staff.element),
                    width: 48,
                    height: 48
                  }}>
                    {suggestion.staff.name?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {suggestion.staff.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip 
                        label={`${suggestion.staff.zodiac_sign} (${suggestion.staff.element})`}
                        size="small"
                        sx={{ bgcolor: getElementColor(suggestion.staff.element), color: 'white' }}
                      />
                      <Chip 
                        label={suggestion.staff.role}
                        variant="outlined"
                        size="small"
                      />
                      <Chip 
                        label={`${suggestion.staff.experience_years}yr exp`}
                        color={suggestion.staff.experience_years >= 3 ? 'success' : 'warning'}
                        size="small"
                      />
                      <Chip 
                        label={`${suggestion.current_load} current assignments`}
                        color={suggestion.current_load >= 4 ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={suggestion.compatibility * 100}
                      color={getCompatibilityColor(suggestion.compatibility)}
                      sx={{ width: 100, height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="caption">
                      {(suggestion.compatibility * 100).toFixed(0)}% match
                    </Typography>
                    <Typography variant="body2" color="primary">
                      {suggestion.recommendation}
                    </Typography>
                  </Box>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    {suggestion.factors.join(' • ')}
                  </Typography>
                </Alert>

                <Button 
                  variant="contained"
                  size="small"
                  onClick={() => createAssignment(selectedCadet.id, suggestion.staff.id)}
                  disabled={suggestion.current_load >= 5}
                >
                  Assign Supervisor
                </Button>
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialog} onClose={() => setRatingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rate Assignment Effectiveness</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" gutterBottom>
              How effective is this supervisor assignment?
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              size="large"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Notes (optional)"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the effectiveness, any challenges, or recommendations..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialog(false)}>Cancel</Button>
          <Button onClick={updateEffectiveness} variant="contained">
            Save Rating
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupervisorAssignments;
