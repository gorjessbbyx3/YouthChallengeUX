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
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  VolunteerActivism as ServiceIcon,
  Psychology as MentorshipIcon
} from '@mui/icons-material';

const Reports = () => {
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [exportFormat, setExportFormat] = useState('json');
  const [reportType, setReportType] = useState('dod');

  useEffect(() => {
    fetchDashboardMetrics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/dashboard-metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      setDashboardMetrics(result);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      const currentYear = new Date().getFullYear();

      const response = await fetch(`/api/reports/export/${reportType}?format=${exportFormat}&quarter=${currentQuarter}&year=${currentYear}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (exportFormat === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json();
        const dataStr = JSON.stringify(result, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'success';
      case 'needs_attention': return 'error';
      default: return 'default';
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboardMetrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dashboard metrics</Alert>
      </Box>
    );
  }

  const { summary, targets, monthlyTrends } = dashboardMetrics;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <AssessmentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          DoD Reporting Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="dod">DoD Quarterly</MenuItem>
              <MenuItem value="quarterly">Program Review</MenuItem>
              <MenuItem value="annual">Annual Summary</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="DoD Metrics" />
        <Tab label="Trends & Analytics" />
        <Tab label="Performance Breakdown" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Key Performance Indicators */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Department of Defense Key Metrics</Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{summary.hisetRate.toFixed(1)}%</Typography>
                <Typography color="textSecondary">HiSET Completion</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={`Target: ${targets.hisetTarget}%`}
                    color={getStatusColor(targets.hisetStatus)}
                    size="small"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (summary.hisetRate / targets.hisetTarget) * 100)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <WorkIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">{summary.workforceRate.toFixed(1)}%</Typography>
                <Typography color="textSecondary">Workforce Placement</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={`Target: ${targets.workforceTarget}%`}
                    color={getStatusColor(targets.workforceStatus)}
                    size="small"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (summary.workforceRate / targets.workforceTarget) * 100)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ServiceIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{formatNumber(summary.serviceHours)}</Typography>
                <Typography color="textSecondary">Service Hours</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={`Target: ${formatNumber(targets.serviceHoursTarget)}`}
                    color={getStatusColor(targets.serviceStatus)}
                    size="small"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (summary.serviceHours / targets.serviceHoursTarget) * 100)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <MentorshipIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">{Math.round(summary.mentorshipHours)}</Typography>
                <Typography color="textSecondary">Mentorship Hours</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label="Monthly Target: 500"
                    color={summary.mentorshipHours >= 500 ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Program Overview Cards */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Program Enrollment</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Total Cadets:</Typography>
                  <Typography variant="h6">{summary.totalCadets}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Active Cadets:</Typography>
                  <Typography variant="h6" color="primary">{summary.activeCadets}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Graduated:</Typography>
                  <Typography variant="h6" color="success.main">{summary.graduatedCadets}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={summary.graduationRate}
                  sx={{ mt: 2 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Graduation Rate: {summary.graduationRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Academic Performance</Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {summary.avgGrade.toFixed(1)}
                  </Typography>
                  <Typography color="textSecondary">Average Grade</Typography>
                  <Chip 
                    label={summary.avgGrade >= 80 ? 'Excellent' : summary.avgGrade >= 70 ? 'Good' : 'Needs Improvement'}
                    color={summary.avgGrade >= 80 ? 'success' : summary.avgGrade >= 70 ? 'primary' : 'error'}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Behavioral Progress</Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={summary.behaviorTrend <= 3 ? 'success.main' : summary.behaviorTrend <= 5 ? 'primary.main' : 'error.main'}>
                    {summary.behaviorTrend.toFixed(1)}
                  </Typography>
                  <Typography color="textSecondary">Behavior Score</Typography>
                  <Chip 
                    label={summary.behaviorTrend <= 3 ? 'Excellent Progress' : summary.behaviorTrend <= 5 ? 'Stable' : 'Needs Support'}
                    color={summary.behaviorTrend <= 3 ? 'success' : summary.behaviorTrend <= 5 ? 'primary' : 'error'}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Monthly Trends</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="serviceHours" stackId="1" stroke="#4CAF50" fill="#4CAF50" name="Service Hours" />
                    <Area type="monotone" dataKey="mentorshipHours" stackId="1" stroke="#2196F3" fill="#2196F3" name="Mentorship Hours" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Cadet Enrollment Trends</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newCadets" stroke="#FF9800" name="New Enrollments" />
                    <Line type="monotone" dataKey="graduations" stroke="#4CAF50" name="Graduations" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Resource Utilization</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">Inventory Value: ${formatNumber(summary.inventoryValue)}</Typography>
                  <Typography variant="body2" color={summary.lowStockItems > 5 ? 'error' : 'success'}>
                    Low Stock Items: {summary.lowStockItems}
                  </Typography>
                </Box>
                <Alert severity={summary.lowStockItems > 5 ? 'warning' : 'success'}>
                  {summary.lowStockItems > 5 
                    ? 'Review inventory management - multiple items need restocking'
                    : 'Inventory levels are well maintained'
                  }
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Performance Status
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      {targets.hisetStatus === 'on_track' ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="HiSET Completion Rate"
                      secondary={`${summary.hisetRate.toFixed(1)}% (Target: ${targets.hisetTarget}%)`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {targets.workforceStatus === 'on_track' ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Workforce Placement"
                      secondary={`${summary.workforceRate.toFixed(1)}% (Target: ${targets.workforceTarget}%)`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {targets.serviceStatus === 'on_track' ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Community Service Hours"
                      secondary={`${formatNumber(summary.serviceHours)} (Target: ${formatNumber(targets.serviceHoursTarget)})`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Last Updated</Typography>
                <Typography variant="body2" color="textSecondary">
                  {new Date(dashboardMetrics.lastUpdated).toLocaleString()}
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={fetchDashboardMetrics}
                  sx={{ mt: 2 }}
                  startIcon={<TrendingUpIcon />}
                >
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Reports;