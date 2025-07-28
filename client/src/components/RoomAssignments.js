
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
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import axios from 'axios';

const RoomAssignments = () => {
  const [rooms, setRooms] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [optimizedRooms, setOptimizedRooms] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchRoomAssignments();
  }, []);

  const fetchRoomAssignments = async () => {
    try {
      const token = localStorage.getItem('auth');
      const response = await axios.get('/api/room-assignments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data.rooms);
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error('Error fetching room assignments:', error);
    }
  };

  const getSuggestions = async (cadetId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth');
      const response = await axios.get(`/api/room-assignments/suggestions/${cadetId}`, {
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

  const optimizeAllRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth');
      const response = await axios.post('/api/room-assignments/optimize', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOptimizedRooms(response.data.optimized_rooms);
      setTabValue(1); // Switch to optimization tab
    } catch (error) {
      console.error('Error optimizing rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyOptimization = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth');
      await axios.post('/api/room-assignments/assign', {
        assignments: optimizedRooms
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchRoomAssignments();
      setOptimizedRooms([]);
      setTabValue(0);
    } catch (error) {
      console.error('Error applying optimization:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 0.7) return 'success';
    if (score >= 0.5) return 'warning';
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏠 Room & Bed Assignments
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Psychology + Astrology Integration:</strong> Using social learning theory 
          combined with astrological compatibility to create positive peer environments. 
          High-risk cadets are paired with role models for behavioral improvement.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={optimizeAllRooms}
          disabled={loading}
          startIcon={loading && <LinearProgress />}
        >
          🎯 Optimize All Rooms
        </Button>
        {optimizedRooms.length > 0 && (
          <Button 
            variant="contained" 
            color="success"
            onClick={applyOptimization}
            disabled={loading}
          >
            ✅ Apply Optimization
          </Button>
        )}
      </Box>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Current Assignments" />
        <Tab label="Optimized Suggestions" />
        <Tab label="Astrology Guide" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {Object.entries(rooms).map(([roomNumber, roommates]) => (
            <Grid item xs={12} md={6} key={roomNumber}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Room {roomNumber}
                  </Typography>
                  {roommates.map((assignment, index) => (
                    <Box key={assignment.cadet_id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: assignment.behavior_score >= 4 ? 'error.main' : 'success.main' }}>
                          {assignment.first_name?.[0]}{assignment.last_name?.[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1">
                            {assignment.first_name} {assignment.last_name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip 
                              label={`Behavior: ${assignment.behavior_score}`}
                              color={assignment.behavior_score >= 4 ? 'error' : 'success'}
                              size="small"
                            />
                            <Chip 
                              label={assignment.platoon}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => getSuggestions(assignment.cadet_id)}
                          disabled={loading}
                        >
                          Find Roommate
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 1 && optimizedRooms.length > 0 && (
        <Grid container spacing={3}>
          {optimizedRooms.map((room, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ 
                border: room.compatibility_score >= 0.7 ? '2px solid #4caf50' : 
                        room.compatibility_score >= 0.5 ? '2px solid #ff9800' : '2px solid #f44336'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Room {room.room_number}
                    <Chip 
                      label={room.recommendation}
                      color={getCompatibilityColor(room.compatibility_score)}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                  
                  {room.compatibility_score && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Compatibility Score
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={room.compatibility_score * 100}
                        color={getCompatibilityColor(room.compatibility_score)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption">
                        {(room.compatibility_score * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  )}

                  {room.cadets.map((cadet, cadetIndex) => (
                    <Box key={cadet.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                          bgcolor: getElementColor(cadet.element),
                          color: 'white'
                        }}>
                          {cadet.element?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {cadet.first_name} {cadet.last_name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip 
                              label={`${cadet.zodiac_sign} (${cadet.element})`}
                              size="small"
                              sx={{ bgcolor: getElementColor(cadet.element), color: 'white' }}
                            />
                            <Chip 
                              label={`Behavior: ${cadet.behavior_score}`}
                              color={cadet.behavior_score >= 4 ? 'error' : 'success'}
                              size="small"
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      {room.factors.join(' • ')}
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔮 Astrology Compatibility Guide
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Element</strong></TableCell>
                  <TableCell><strong>Signs</strong></TableCell>
                  <TableCell><strong>Compatible With</strong></TableCell>
                  <TableCell><strong>Challenging With</strong></TableCell>
                  <TableCell><strong>Room Pairing Strategy</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Chip label="Fire" sx={{ bgcolor: '#ff5722', color: 'white' }} />
                  </TableCell>
                  <TableCell>Aries, Leo, Sagittarius</TableCell>
                  <TableCell>Air signs (communication), Same element</TableCell>
                  <TableCell>Water signs (emotional clashes)</TableCell>
                  <TableCell>Pair with Air for balance, avoid Water combinations</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Chip label="Earth" sx={{ bgcolor: '#8bc34a', color: 'white' }} />
                  </TableCell>
                  <TableCell>Taurus, Virgo, Capricorn</TableCell>
                  <TableCell>Water signs (growth), Same element</TableCell>
                  <TableCell>Air signs (different pace)</TableCell>
                  <TableCell>Excellent with Water for stability, mentor Fire signs</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Chip label="Air" sx={{ bgcolor: '#2196f3', color: 'white' }} />
                  </TableCell>
                  <TableCell>Gemini, Libra, Aquarius</TableCell>
                  <TableCell>Fire signs (inspiration), Same element</TableCell>
                  <TableCell>Earth signs (different speeds)</TableCell>
                  <TableCell>Great communicators, help Fire signs think things through</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Chip label="Water" sx={{ bgcolor: '#00bcd4', color: 'white' }} />
                  </TableCell>
                  <TableCell>Cancer, Scorpio, Pisces</TableCell>
                  <TableCell>Earth signs (grounding), Same element</TableCell>
                  <TableCell>Fire signs (emotional intensity)</TableCell>
                  <TableCell>Provide emotional support, pair with Earth for stability</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Social Learning Theory Application:</strong> High-risk cadets (behavior score 4-5) 
              should be paired with low-risk role models (behavior score 1-2) regardless of astrological 
              compatibility to promote positive behavioral modeling.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Suggestions Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Roommate Suggestions for {selectedCadet?.first_name} {selectedCadet?.last_name}
          <Chip 
            label={`${selectedCadet?.zodiac_sign} (${selectedCadet?.element})`}
            sx={{ ml: 2, bgcolor: getElementColor(selectedCadet?.element), color: 'white' }}
          />
        </DialogTitle>
        <DialogContent>
          {suggestions.map((suggestion, index) => (
            <Card key={suggestion.cadet.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: getElementColor(suggestion.element) }}>
                    {suggestion.cadet.first_name[0]}{suggestion.cadet.last_name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {suggestion.cadet.first_name} {suggestion.cadet.last_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip 
                        label={`${suggestion.zodiac_sign} (${suggestion.element})`}
                        size="small"
                        sx={{ bgcolor: getElementColor(suggestion.element), color: 'white' }}
                      />
                      <Chip 
                        label={`Behavior: ${suggestion.cadet.behavior_score}`}
                        color={suggestion.cadet.behavior_score >= 4 ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={suggestion.compatibility * 100}
                      color={getCompatibilityColor(suggestion.compatibility)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption">
                      {(suggestion.compatibility * 100).toFixed(0)}% compatibility - {suggestion.recommendation}
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    {suggestion.factors.join(' • ')}
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomAssignments;
