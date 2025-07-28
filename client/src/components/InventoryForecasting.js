
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckIcon,
  Schedule as TimeIcon
} from '@mui/icons-material';
import axios from 'axios';

export const InventoryForecasting = () => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/ai/inventory-forecast');
      setForecast(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching inventory forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const getForecastColor = (forecast) => {
    switch (forecast) {
      case 'immediate': return 'error';
      case 'soon': return 'warning';
      case 'stable': return 'success';
      default: return 'info';
    }
  };

  const getForecastIcon = (forecast) => {
    switch (forecast) {
      case 'immediate': return <WarningIcon color="error" />;
      case 'soon': return <TimeIcon color="warning" />;
      case 'stable': return <CheckIcon color="success" />;
      default: return <InventoryIcon color="info" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <AIIcon sx={{ mr: 2, color: 'primary.main' }} />
          AI Inventory Forecasting
        </Typography>
        <Button variant="contained" onClick={fetchForecast}>
          Refresh Forecast
        </Button>
      </Box>

      {lastUpdated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Last updated: {lastUpdated.toLocaleString()}
        </Alert>
      )}

      <Grid container spacing={3}>
        {forecast.map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {item.name}
                  </Typography>
                  {getForecastIcon(item.forecast)}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Stock: {item.quantity} units
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Threshold: {item.threshold} units
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Usage Rate: {item.adjustedUsageRate} per day
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Stock Level
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (item.quantity / (item.threshold * 2)) * 100)}
                    color={item.quantity <= item.threshold ? 'error' : 'success'}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={item.forecast}
                    color={getForecastColor(item.forecast)}
                    size="small"
                  />
                  <Chip
                    label={`${item.daysUntilEmpty} days left`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${item.confidenceScore}% confidence`}
                    size="small"
                    color="info"
                  />
                </Box>

                {item.recommendations && item.recommendations.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      AI Recommendations:
                    </Typography>
                    <List dense>
                      {item.recommendations.map((rec, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText
                            primary={rec}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {forecast.length === 0 && (
        <Alert severity="info">
          No inventory data available for forecasting. Add items to your inventory to see AI predictions.
        </Alert>
      )}
    </Box>
  );
};
