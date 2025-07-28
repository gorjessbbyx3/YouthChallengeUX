
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
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import axios from 'axios';

export const AcademicTracking = () => {
  const [cadets, setCadets] = useState([]);
  const [academicRecords, setAcademicRecords] = useState([]);
  const [open, setOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    cadet_id: '',
    subject: '',
    assignment_type: '',
    score: '',
    max_score: 100,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchCadets();
    fetchAcademicRecords();
  }, []);

  const fetchCadets = async () => {
    try {
      const response = await axios.get('/api/cadets');
      setCadets(response.data);
    } catch (error) {
      console.error('Error fetching cadets:', error);
    }
  };

  const fetchAcademicRecords = async () => {
    try {
      const response = await axios.get('/api/academic-tracking');
      setAcademicRecords(response.data);
    } catch (error) {
      console.error('Error fetching academic records:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/academic-tracking', newRecord);
      setOpen(false);
      setNewRecord({
        cadet_id: '',
        subject: '',
        assignment_type: '',
        score: '',
        max_score: 100,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchAcademicRecords();
      fetchCadets(); // Refresh to update academic scores
    } catch (error) {
      console.error('Error creating academic record:', error);
    }
  };

  const getAcademicTrend = (cadetId) => {
    const cadetRecords = academicRecords
      .filter(r => r.cadet_id === cadetId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    if (cadetRecords.length < 2) return 'neutral';
    
    const recent = cadetRecords.slice(0, 2).reduce((sum, r) => sum + (r.score / r.max_score * 100), 0) / 2;
    const older = cadetRecords.slice(2).reduce((sum, r) => sum + (r.score / r.max_score * 100), 0) / (cadetRecords.length - 2);
    
    if (recent > older + 10) return 'improving';
    if (recent < older - 10) return 'declining';
    return 'stable';
  };

  const getAcademicInsights = (cadet) => {
    const cadetRecords = academicRecords
      .filter(r => r.cadet_id === cadet.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    if (cadetRecords.length === 0) return 'No academic data available';

    const avgPercentage = cadetRecords.reduce((sum, r) => sum + (r.score / r.max_score * 100), 0) / cadetRecords.length;
    
    if (avgPercentage >= 80) {
      return `🟢 Excellent performance (${avgPercentage.toFixed(1)}%). Consider advanced coursework or peer tutoring opportunities.`;
    } else if (avgPercentage >= 70) {
      return `🟡 Good progress (${avgPercentage.toFixed(1)}%). Continue current support strategies.`;
    } else if (avgPercentage >= 60) {
      return `🟠 Needs support (${avgPercentage.toFixed(1)}%). Consider additional tutoring and learning style assessment.`;
    } else {
      return `🔴 Requires intervention (${avgPercentage.toFixed(1)}%). Implement individualized learning plan and address potential barriers.`;
    }
  };

  const subjects = [
    'Mathematics',
    'Science',
    'English/Language Arts',
    'Social Studies',
    'Test Preparation (HiSET)',
    'Life Skills',
    'Computer Skills',
    'Physical Education'
  ];

  const assignmentTypes = [
    'Quiz',
    'Test',
    'Homework',
    'Project',
    'Presentation',
    'HiSET Practice Test',
    'Skills Assessment'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <SchoolIcon sx={{ mr: 2 }} />
          Academic Progress Tracking
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add Grade
        </Button>
      </Box>

      <Grid container spacing={3}>
        {cadets.map((cadet) => {
          const trend = getAcademicTrend(cadet.id);
          const insights = getAcademicInsights(cadet);
          const recentRecords = academicRecords
            .filter(r => r.cadet_id === cadet.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

          const avgScore = recentRecords.length > 0 
            ? recentRecords.reduce((sum, r) => sum + (r.score / r.max_score * 100), 0) / recentRecords.length 
            : 0;

          return (
            <Grid item xs={12} md={6} lg={4} key={cadet.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {cadet.first_name} {cadet.last_name}
                    </Typography>
                    <Chip
                      icon={<TrendingUpIcon />}
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
                      Average Performance
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={avgScore} 
                        sx={{ flexGrow: 1, mr: 2 }}
                        color={avgScore >= 70 ? 'success' : avgScore >= 60 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2">
                        {avgScore.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>

                  <Alert 
                    severity={
                      avgScore >= 80 ? 'success' :
                      avgScore >= 70 ? 'info' :
                      avgScore >= 60 ? 'warning' : 'error'
                    }
                    sx={{ mb: 2, fontSize: '0.8rem' }}
                  >
                    {insights}
                  </Alert>

                  {recentRecords.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Recent Grades:
                      </Typography>
                      {recentRecords.map((record, index) => (
                        <Chip
                          key={index}
                          label={`${record.subject}: ${record.score}/${record.max_score}`}
                          size="small"
                          color={
                            (record.score / record.max_score * 100) >= 70 ? 'success' :
                            (record.score / record.max_score * 100) >= 60 ? 'warning' : 'error'
                          }
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
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon sx={{ mr: 1 }} />
            Recent Academic Records
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Cadet</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Assignment</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Percentage</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {academicRecords
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 15)
                  .map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        {record.cadet_first_name} {record.cadet_last_name}
                      </TableCell>
                      <TableCell>{record.subject}</TableCell>
                      <TableCell>{record.assignment_type}</TableCell>
                      <TableCell>{record.score}/{record.max_score}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${(record.score / record.max_score * 100).toFixed(1)}%`}
                          color={
                            (record.score / record.max_score * 100) >= 70 ? 'success' :
                            (record.score / record.max_score * 100) >= 60 ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{record.notes}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Academic Record</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Cadet</InputLabel>
                  <Select
                    value={newRecord.cadet_id}
                    onChange={(e) => setNewRecord({...newRecord, cadet_id: e.target.value})}
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
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={newRecord.subject}
                    onChange={(e) => setNewRecord({...newRecord, subject: e.target.value})}
                    required
                  >
                    {subjects.map((subject) => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Assignment Type</InputLabel>
                  <Select
                    value={newRecord.assignment_type}
                    onChange={(e) => setNewRecord({...newRecord, assignment_type: e.target.value})}
                    required
                  >
                    {assignmentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Score"
                  value={newRecord.score}
                  onChange={(e) => setNewRecord({...newRecord, score: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Score"
                  value={newRecord.max_score}
                  onChange={(e) => setNewRecord({...newRecord, max_score: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                  placeholder="Additional notes about performance, areas for improvement, etc."
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth>
                  Add Academic Record
                </Button>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
