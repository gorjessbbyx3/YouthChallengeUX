
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Chip,
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
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Groups as GroupsIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import axios from 'axios';

export const SchedulingAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [schedulesRes, staffRes, cadetsRes] = await Promise.all([
        axios.get('/api/scheduling'),
        axios.get('/api/staff'),
        axios.get('/api/cadets')
      ]);

      const schedules = schedulesRes.data;
      const staff = staffRes.data;
      const cadets = cadetsRes.data;

      // Calculate analytics
      const staffWorkload = staff.map(member => {
        const memberSchedules = schedules.filter(s => s.staff_id === member.id);
        const weeklyHours = memberSchedules.length * 2; // Assume 2 hours per shift
        
        return {
          ...member,
          weekly_hours: weeklyHours,
          workload_percentage: Math.min((weeklyHours / 40) * 100, 100),
          shift_count: memberSchedules.length
        };
      });

      const highRiskCadets = cadets.filter(c => c.behavior_score <= 2).length;
      const totalCadets = cadets.length;
      const experiencedStaff = staff.filter(s => s.experience_years >= 2).length;

      setAnalytics({
        staff_workload: staffWorkload,
        coverage_metrics: {
          high_risk_cadets: highRiskCadets,
          total_cadets: totalCadets,
          experienced_staff: experiencedStaff,
          staff_to_cadet_ratio: totalCadets > 0 ? (staff.length / totalCadets).toFixed(2) : 0,
          high_risk_coverage: experiencedStaff >= highRiskCadets
        },
        schedule_efficiency: {
          total_shifts: schedules.length,
          average_staff_utilization: staffWorkload.reduce((sum, s) => sum + s.workload_percentage, 0) / staff.length
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!analytics) {
    return <Alert severity="error">Failed to load scheduling analytics</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <PsychologyIcon sx={{ mr: 2 }} />
        AI Scheduling Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Coverage Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupsIcon sx={{ mr: 1 }} />
                Coverage Analysis
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Staff-to-Cadet Ratio: 1:{Math.round(1 / analytics.coverage_metrics.staff_to_cadet_ratio)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(analytics.coverage_metrics.staff_to_cadet_ratio * 100, 100)}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  High-Risk Cadet Coverage: {analytics.coverage_metrics.high_risk_cadets} cadets, 
                  {analytics.coverage_metrics.experienced_staff} experienced staff
                </Typography>
                <Chip 
                  label={analytics.coverage_metrics.high_risk_coverage ? "Adequate" : "Needs Attention"}
                  color={analytics.coverage_metrics.high_risk_coverage ? "success" : "warning"}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>

              {!analytics.coverage_metrics.high_risk_coverage && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  💡 AI Insight: Consider assigning more experienced staff to high-risk cadet supervision
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Schedule Efficiency */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                Efficiency Metrics
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Average Staff Utilization
                </Typography>
                <Typography variant="h4">
                  {analytics.schedule_efficiency.average_staff_utilization.toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={analytics.schedule_efficiency.average_staff_utilization}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Typography variant="body2">
                Total Active Shifts: {analytics.schedule_efficiency.total_shifts}
              </Typography>

              {analytics.schedule_efficiency.average_staff_utilization > 80 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  ⚠️ High utilization detected - consider workload balance
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Staff Workload Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                Staff Workload Distribution
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff Member</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Experience</TableCell>
                      <TableCell>Weekly Shifts</TableCell>
                      <TableCell>Utilization</TableCell>
                      <TableCell>AI Recommendation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.staff_workload.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>{staff.first_name} {staff.last_name}</TableCell>
                        <TableCell>{staff.role}</TableCell>
                        <TableCell>{staff.experience_years || 0} years</TableCell>
                        <TableCell>{staff.shift_count}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {staff.workload_percentage.toFixed(0)}%
                            <LinearProgress 
                              variant="determinate" 
                              value={staff.workload_percentage}
                              sx={{ ml: 1, width: 60 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {staff.workload_percentage > 90 && (
                            <Chip label="Reduce Load" color="error" size="small" />
                          )}
                          {staff.workload_percentage < 30 && (
                            <Chip label="Can Take More" color="success" size="small" />
                          )}
                          {staff.workload_percentage >= 30 && staff.workload_percentage <= 90 && (
                            <Chip label="Well Balanced" color="info" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
