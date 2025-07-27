
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Bar,
  Line,
  Doughnut
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch various statistics
      const [cadetsRes, inventoryRes, alertsRes] = await Promise.all([
        axios.get('/api/cadets', { headers }),
        axios.get('/api/ai/inventory-forecast', { headers }),
        axios.get('/api/reports/alerts', { headers })
      ]);
      
      const cadets = cadetsRes.data;
      const inventory = inventoryRes.data;
      
      // Calculate statistics
      const totalCadets = cadets.length;
      const highRiskCadets = cadets.filter(c => c.behavior_score <= 2).length;
      const hisetCompleted = cadets.filter(c => c.hiset_status === 'completed').length;
      const successfulPlacements = cadets.filter(c => 
        ['workforce', 'education', 'military'].includes(c.placement_status)
      ).length;
      
      const lowStockItems = inventory.filter(item => item.needsRestock).length;
      
      setStats({
        totalCadets,
        highRiskCadets,
        hisetCompleted,
        successfulPlacements,
        hisetCompletionRate: totalCadets > 0 ? (hisetCompleted / totalCadets * 100).toFixed(1) : 0,
        placementRate: totalCadets > 0 ? (successfulPlacements / totalCadets * 100).toFixed(1) : 0,
        lowStockItems,
        cadets,
        inventory
      });
      
      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Chart data
  const behaviorScoreData = {
    labels: ['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5'],
    datasets: [{
      label: 'Number of Cadets',
      data: [1,2,3,4,5].map(score => 
        stats.cadets.filter(c => c.behavior_score === score).length
      ),
      backgroundColor: ['#ff6b6b', '#ffa726', '#ffee58', '#66bb6a', '#4caf50']
    }]
  };

  const placementData = {
    labels: ['Workforce', 'Education', 'Military', 'Other'],
    datasets: [{
      data: [
        stats.cadets.filter(c => c.placement_status === 'workforce').length,
        stats.cadets.filter(c => c.placement_status === 'education').length,
        stats.cadets.filter(c => c.placement_status === 'military').length,
        stats.cadets.filter(c => !['workforce', 'education', 'military'].includes(c.placement_status)).length
      ],
      backgroundColor: ['#2196f3', '#4caf50', '#ff9800', '#9e9e9e']
    }]
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        YCA Kapolei Dashboard
      </Typography>
      
      {/* Alerts */}
      {alerts.map((alert, index) => (
        <Alert key={index} severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      ))}
      
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Cadets
              </Typography>
              <Typography variant="h4">
                {stats.totalCadets}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                HiSET Completion Rate
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.hisetCompletionRate}%
              </Typography>
              <Typography variant="body2">
                Target: 78%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Placement Rate
              </Typography>
              <Typography variant="h4" color="secondary">
                {stats.placementRate}%
              </Typography>
              <Typography variant="body2">
                Target: 48%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High-Risk Cadets
              </Typography>
              <Typography variant="h4" color="error">
                {stats.highRiskCadets}
              </Typography>
              <Typography variant="body2">
                Behavior Score ≤ 2
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cadet Behavior Scores
              </Typography>
              <Bar data={behaviorScoreData} options={{ responsive: true }} />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Placement Distribution
              </Typography>
              <Doughnut data={placementData} options={{ responsive: true }} />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inventory Status
              </Typography>
              <Typography variant="body1">
                {stats.lowStockItems} items need restocking
              </Typography>
              {stats.inventory.filter(item => item.needsRestock).map(item => (
                <Alert key={item.id} severity="warning" sx={{ mt: 1 }}>
                  {item.name}: {item.projectedQuantity} remaining (threshold: {item.threshold})
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
