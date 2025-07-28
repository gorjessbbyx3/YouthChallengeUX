import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Bar,
  Line,
  Pie
} from 'react-chartjs-2';
import { saveAs } from 'file-saver';
import axios from 'axios';

export const Reports = () => {
  const [reportType, setReportType] = useState('behavioral');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateReport();
  }, [reportType]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(`/api/reports/${reportType}`, { headers });
      setReportData(response.data);
    } catch (err) {
      setError('Failed to generate report');
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format = 'csv') => {
    try {
      const token = localStorage.getItem('auth');
      const response = await axios.get(`/api/reports/${reportType}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      saveAs(blob, `${reportType}_report.${format}`);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  const renderBehavioralReport = () => {
    if (!reportData) return null;

    const behaviorData = {
      labels: ['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5'],
      datasets: [{
        label: 'Number of Cadets',
        data: reportData.behaviorDistribution,
        backgroundColor: ['#ff6b6b', '#ffa726', '#ffee58', '#66bb6a', '#4caf50']
      }]
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Behavior Score Distribution
              </Typography>
              <Bar data={behaviorData} options={{ responsive: true }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                High-Risk Cadets ({reportData.highRiskCount})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Risk Level</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.highRiskCadets?.map((cadet) => (
                      <TableRow key={cadet.id}>
                        <TableCell>{cadet.name}</TableCell>
                        <TableCell>{cadet.behavior_score}</TableCell>
                        <TableCell>{cadet.risk_level}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderAcademicReport = () => {
    if (!reportData) return null;

    const hisetData = {
      labels: ['Not Started', 'In Progress', 'Completed'],
      datasets: [{
        data: reportData.hisetDistribution,
        backgroundColor: ['#ff9800', '#2196f3', '#4caf50']
      }]
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                HiSET Status Distribution
              </Typography>
              <Pie data={hisetData} options={{ responsive: true }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Academic Performance Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Completion Rate: {reportData.completionRate}%
                </Typography>
                <Typography variant="body1">
                  Target: 78%
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Average Time to Complete: {reportData.avgCompletionTime} days
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPlacementReport = () => {
    if (!reportData) return null;

    const placementData = {
      labels: ['Workforce', 'Education', 'Military', 'Seeking'],
      datasets: [{
        data: reportData.placementDistribution,
        backgroundColor: ['#2196f3', '#4caf50', '#ff9800', '#9e9e9e']
      }]
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Placement Distribution
              </Typography>
              <Pie data={placementData} options={{ responsive: true }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Placement Success Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Success Rate: {reportData.successRate}%
                </Typography>
                <Typography variant="body1">
                  Target: 48%
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Top Placement Sectors:
                </Typography>
                {reportData.topSectors?.map((sector, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                    • {sector.name}: {sector.count} placements
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderEventReport = () => {
    if (!reportData) return null;

    // Example data (replace with actual event data)
    const eventData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Events Held',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Events Over Time
              </Typography>
              <Line data={eventData} options={{ responsive: true }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Events
              </Typography>
              {/* Replace with actual upcoming events data */}
              <Typography variant="body1">No upcoming events scheduled.</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      );
    }

    switch (reportType) {
      case 'behavioral':
        return renderBehavioralReport();
      case 'academic':
        return renderAcademicReport();
      case 'placement':
        return renderPlacementReport();
      case 'events':
        return renderEventReport();
      default:
        return <Typography>Select a report type</Typography>;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        YCA Reports & Analytics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            label="Report Type"
          >
            <MenuItem value="behavioral">Behavioral Analysis</MenuItem>
            <MenuItem value="academic">Academic Progress</MenuItem>
            <MenuItem value="placement">Placement Outcomes</MenuItem>
            <MenuItem value="attendance">Attendance Reports</MenuItem>
            <MenuItem value="mentorship">Mentorship Effectiveness</MenuItem>
            <MenuItem value="events">Event Reports</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={generateReport}
          disabled={loading}
        >
          Refresh Report
        </Button>

        <Button
          variant="contained"
          onClick={() => exportReport('csv')}
          disabled={loading || !reportData}
        >
          Export CSV
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={() => exportReport('pdf')}
          disabled={loading || !reportData}
        >
          Export PDF
        </Button>
      </Box>

      {renderContent()}
    </Box>
  );
};