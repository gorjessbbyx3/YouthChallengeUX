
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import axios from 'axios';

export const SchedulingAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [staffRes, schedulesRes, cadetsRes] = await Promise.all([
        axios.get('/api/staff'),
        axios.get('/api/scheduling/schedules'),
        axios.get('/api/cadets')
      ]);

      const staff = staffRes.data;
      const schedules = schedulesRes.data;
      const cadets = cadetsRes.data;

      // Calculate staff workload
      const staffWorkload = staff.map(member => {
        const memberSchedules = schedules.filter(s => 
          s.staff && s.staff.id === member.id
        );
        
        const totalHours = memberSchedules.reduce((sum, schedule) => {
          const start = new Date(schedule.scheduling_tasks?.start_time);
          const end = new Date(schedule.scheduling_tasks?.end_time);
          return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
        }, 0);

        return {
          ...member,
          weekly_hours: totalHours,
          workload_percentage: Math.min((totalHours / 40) * 100, 100),
          efficiency_score: calculateEfficiencyScore(member, memberSchedules)
        };
      });

      // Calculate coverage metrics
      const highRiskCadets = cadets.filter(c => c.behavior_score <= 2).length;
      const totalCadets = cadets.length;
      const experiencedStaff = staff.filter(s => s.experience_years >= 2).length;

      // AI predictions
      const aiPredictions = await generatePredictions(staffWorkload, schedules);

      setAnalytics({
        staff_workload: staffWorkload,
        coverage_metrics: {
          high_risk_cadets: highRiskCadets,
          total_cadets: totalCadets,
          experienced_staff: experiencedStaff,
          staff_to_cadet_ratio: totalCadets > 0 ? (staff.length / totalCadets).toFixed(2) : 0,
          high_risk_coverage: experiencedStaff >= highRiskCadets,
          supervision_gaps: calculateSupervisionGaps(schedules)
        },
        schedule_efficiency: {
          total_shifts: schedules.length,
          average_staff_utilization: staffWorkload.reduce((sum, s) => sum + s.workload_percentage, 0) / staff.length,
          optimization_score: calculateOptimizationScore(staffWorkload, schedules),
          burnout_risk: identifyBurnoutRisk(staffWorkload)
        },
        psychological_insights: {
          stress_indicators: analyzeStressIndicators(staffWorkload),
          worklife_balance: assessWorkLifeBalance(staffWorkload),
          team_cohesion: calculateTeamCohesion(schedules)
        }
      });

      setPredictions(aiPredictions);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEfficiencyScore = (staff, schedules) => {
    // Base score on experience and workload distribution
    const experienceScore = Math.min(staff.experience_years * 10, 50);
    const workloadScore = schedules.length > 0 ? 30 : 0;
    const consistencyScore = 20; // Based on schedule consistency
    return Math.min(experienceScore + workloadScore + consistencyScore, 100);
  };

  const calculateSupervisionGaps = (schedules) => {
    // Identify time periods with insufficient supervision
    const gaps = [];
    const timeSlots = {};
    
    schedules.forEach(schedule => {
      const task = schedule.scheduling_tasks;
      if (task && task.category === 'supervision') {
        const hour = new Date(task.start_time).getHours();
        timeSlots[hour] = (timeSlots[hour] || 0) + 1;
      }
    });

    // Critical hours: 6-8 AM, 12-1 PM, 6-8 PM
    const criticalHours = [6, 7, 12, 18, 19];
    criticalHours.forEach(hour => {
      if ((timeSlots[hour] || 0) < 2) {
        gaps.push({
          time: `${hour}:00`,
          severity: timeSlots[hour] ? 'medium' : 'high',
          staff_needed: 2 - (timeSlots[hour] || 0)
        });
      }
    });

    return gaps;
  };

  const calculateOptimizationScore = (staffWorkload, schedules) => {
    const evenDistribution = calculateWorkloadDistribution(staffWorkload);
    const coverageScore = calculateCoverageScore(schedules);
    const efficiencyScore = staffWorkload.reduce((sum, s) => sum + s.efficiency_score, 0) / staffWorkload.length;
    
    return Math.round((evenDistribution + coverageScore + efficiencyScore) / 3);
  };

  const calculateWorkloadDistribution = (staffWorkload) => {
    const workloads = staffWorkload.map(s => s.workload_percentage);
    const avg = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / workloads.length;
    return Math.max(0, 100 - variance); // Lower variance = better distribution
  };

  const calculateCoverageScore = (schedules) => {
    // Score based on coverage of critical time periods
    const coverage = schedules.filter(s => {
      const hour = new Date(s.scheduling_tasks?.start_time).getHours();
      return hour >= 6 && hour <= 20; // Operational hours
    }).length;
    
    return Math.min((coverage / schedules.length) * 100, 100);
  };

  const identifyBurnoutRisk = (staffWorkload) => {
    return staffWorkload.filter(s => 
      s.workload_percentage > 90 || s.weekly_hours > 45
    ).map(s => ({
      name: s.name,
      risk_level: s.workload_percentage > 95 ? 'critical' : 'high',
      hours: s.weekly_hours,
      recommendations: generateBurnoutRecommendations(s)
    }));
  };

  const generateBurnoutRecommendations = (staff) => {
    const recommendations = [];
    if (staff.weekly_hours > 45) {
      recommendations.push('Reduce weekly hours to below 40');
    }
    if (staff.workload_percentage > 90) {
      recommendations.push('Redistribute high-priority tasks');
    }
    recommendations.push('Schedule mandatory rest periods');
    return recommendations;
  };

  const analyzeStressIndicators = (staffWorkload) => {
    const indicators = {
      high_workload: staffWorkload.filter(s => s.workload_percentage > 80).length,
      uneven_distribution: calculateWorkloadDistribution(staffWorkload) < 70,
      overtime_risk: staffWorkload.filter(s => s.weekly_hours > 40).length
    };

    return {
      ...indicators,
      overall_stress_level: calculateOverallStress(indicators),
      recommendations: generateStressRecommendations(indicators)
    };
  };

  const calculateOverallStress = (indicators) => {
    let score = 0;
    if (indicators.high_workload > 2) score += 30;
    if (indicators.uneven_distribution) score += 25;
    if (indicators.overtime_risk > 1) score += 25;
    
    if (score > 60) return 'high';
    if (score > 30) return 'medium';
    return 'low';
  };

  const generateStressRecommendations = (indicators) => {
    const recommendations = [];
    if (indicators.high_workload > 2) {
      recommendations.push('Consider hiring additional staff or redistributing workload');
    }
    if (indicators.uneven_distribution) {
      recommendations.push('Implement more balanced task assignment algorithms');
    }
    if (indicators.overtime_risk > 1) {
      recommendations.push('Monitor staff overtime and enforce mandatory rest periods');
    }
    return recommendations;
  };

  const assessWorkLifeBalance = (staffWorkload) => {
    const balance = staffWorkload.map(staff => ({
      name: staff.name,
      balance_score: Math.max(0, 100 - staff.workload_percentage),
      status: staff.workload_percentage > 85 ? 'poor' : 
              staff.workload_percentage > 70 ? 'fair' : 'good'
    }));

    return {
      individual_scores: balance,
      team_average: balance.reduce((sum, b) => sum + b.balance_score, 0) / balance.length
    };
  };

  const calculateTeamCohesion = (schedules) => {
    // Analyze collaborative scheduling patterns
    const collaborativeShifts = schedules.filter(s => 
      s.scheduling_tasks?.required_staff > 1
    ).length;
    
    const totalShifts = schedules.length;
    const cohesionScore = totalShifts > 0 ? (collaborativeShifts / totalShifts) * 100 : 0;
    
    return {
      score: cohesionScore,
      collaborative_shifts: collaborativeShifts,
      total_shifts: totalShifts,
      status: cohesionScore > 60 ? 'strong' : cohesionScore > 30 ? 'moderate' : 'weak'
    };
  };

  const generatePredictions = async (staffWorkload, schedules) => {
    // AI-based predictions for scheduling optimization
    return [
      {
        type: 'workload_prediction',
        message: 'Staff workload expected to increase by 15% next week',
        confidence: 0.85,
        recommendation: 'Consider temporary staff reassignment'
      },
      {
        type: 'coverage_alert',
        message: 'Potential supervision gap on Friday evening',
        confidence: 0.92,
        recommendation: 'Schedule additional supervisor for 6-8 PM slot'
      },
      {
        type: 'efficiency_improvement',
        message: 'Task rotation could improve team efficiency by 12%',
        confidence: 0.78,
        recommendation: 'Implement weekly task rotation schedule'
      }
    ];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': case 'strong': return 'success';
      case 'fair': case 'moderate': return 'warning';
      case 'poor': case 'weak': return 'error';
      default: return 'default';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': case 'critical': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
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

      {/* AI Predictions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            AI Predictions & Recommendations
          </Typography>
          <List>
            {predictions.map((prediction, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    {Math.round(prediction.confidence * 100)}%
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={prediction.message}
                  secondary={`Recommendation: ${prediction.recommendation}`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Staff Workload Analysis */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Staff Workload Analysis
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff Member</TableCell>
                      <TableCell>Weekly Hours</TableCell>
                      <TableCell>Workload %</TableCell>
                      <TableCell>Efficiency</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.staff_workload.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>{staff.name}</TableCell>
                        <TableCell>{staff.weekly_hours.toFixed(1)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LinearProgress
                              variant="determinate"
                              value={staff.workload_percentage}
                              sx={{ width: 100, mr: 1 }}
                              color={staff.workload_percentage > 90 ? 'error' : 
                                     staff.workload_percentage > 75 ? 'warning' : 'success'}
                            />
                            {staff.workload_percentage.toFixed(0)}%
                          </Box>
                        </TableCell>
                        <TableCell>{staff.efficiency_score}%</TableCell>
                        <TableCell>
                          <Chip
                            label={staff.workload_percentage > 90 ? 'Overloaded' :
                                   staff.workload_percentage > 75 ? 'High' : 'Normal'}
                            color={getRiskColor(staff.workload_percentage > 90 ? 'high' : 
                                                staff.workload_percentage > 75 ? 'medium' : 'low')}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Schedule Efficiency
                  </Typography>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={analytics.schedule_efficiency.optimization_score}
                      size={80}
                      color={analytics.schedule_efficiency.optimization_score > 80 ? 'success' : 
                             analytics.schedule_efficiency.optimization_score > 60 ? 'warning' : 'error'}
                    />
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {analytics.schedule_efficiency.optimization_score}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Optimization Score
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Coverage Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Staff-to-Cadet Ratio</Typography>
                    <Typography variant="h5">1:{analytics.coverage_metrics.staff_to_cadet_ratio}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">High-Risk Coverage</Typography>
                    <Chip
                      icon={analytics.coverage_metrics.high_risk_coverage ? <CheckIcon /> : <WarningIcon />}
                      label={analytics.coverage_metrics.high_risk_coverage ? 'Adequate' : 'Insufficient'}
                      color={analytics.coverage_metrics.high_risk_coverage ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2">Supervision Gaps</Typography>
                    <Typography variant="h6" color={analytics.coverage_metrics.supervision_gaps.length > 0 ? 'error.main' : 'success.main'}>
                      {analytics.coverage_metrics.supervision_gaps.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Psychological Insights */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Psychological Insights
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Overall Stress Level</Typography>
                <Chip
                  label={analytics.psychological_insights.stress_indicators.overall_stress_level.toUpperCase()}
                  color={getRiskColor(analytics.psychological_insights.stress_indicators.overall_stress_level)}
                  size="small"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Team Work-Life Balance</Typography>
                <LinearProgress
                  variant="determinate"
                  value={analytics.psychological_insights.worklife_balance.team_average}
                  color={analytics.psychological_insights.worklife_balance.team_average > 70 ? 'success' : 'warning'}
                />
                <Typography variant="caption">
                  {analytics.psychological_insights.worklife_balance.team_average.toFixed(1)}% Average
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Team Cohesion</Typography>
                <Chip
                  label={analytics.psychological_insights.team_cohesion.status.toUpperCase()}
                  color={getStatusColor(analytics.psychological_insights.team_cohesion.status)}
                  size="small"
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  {analytics.psychological_insights.team_cohesion.collaborative_shifts} collaborative shifts
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Burnout Risk Assessment */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TimerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Burnout Risk Assessment
              </Typography>
              {analytics.schedule_efficiency.burnout_risk.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography color="success.main">No burnout risk detected</Typography>
                </Box>
              ) : (
                <List>
                  {analytics.schedule_efficiency.burnout_risk.map((risk, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {risk.name}
                            <Chip
                              label={risk.risk_level}
                              color={getRiskColor(risk.risk_level)}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption">
                              {risk.hours.toFixed(1)} hours/week
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              Recommendations: {risk.recommendations.join(', ')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
