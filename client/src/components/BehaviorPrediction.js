
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
  Avatar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Warning as WarningIcon,
  Psychology as PsychIcon,
  TrendingUp as TrendIcon,
  Lightbulb as InterventionIcon,
  Shield as LowRiskIcon
} from '@mui/icons-material';
import axios from 'axios';

export const BehaviorPrediction = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/ai/behavior-prediction');
      setPredictions(response.data);
    } catch (error) {
      console.error('Error fetching behavior predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return <WarningIcon color="error" />;
      case 'medium': return <PsychIcon color="warning" />;
      case 'low': return <LowRiskIcon color="success" />;
      default: return <PersonIcon />;
    }
  };

  const handleCadetClick = (cadet) => {
    setSelectedCadet(cadet);
    setDetailsOpen(true);
  };

  const getProgressValue = (score) => Math.min(100, score);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  const highRiskCadets = predictions.filter(p => p.risk_level === 'high');
  const mediumRiskCadets = predictions.filter(p => p.risk_level === 'medium');
  const lowRiskCadets = predictions.filter(p => p.risk_level === 'low');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <PsychIcon sx={{ mr: 2, color: 'primary.main' }} />
          AI Behavior Prediction
        </Typography>
        <Button variant="contained" onClick={fetchPredictions}>
          Refresh Predictions
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error">
                High Risk
              </Typography>
              <Typography variant="h4">
                {highRiskCadets.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Immediate attention needed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Medium Risk
              </Typography>
              <Typography variant="h4">
                {mediumRiskCadets.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor closely
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Low Risk
              </Typography>
              <Typography variant="h4">
                {lowRiskCadets.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stable behavior
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                Total Cadets
              </Typography>
              <Typography variant="h4">
                {predictions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Under monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* High Risk Priority Section */}
      {highRiskCadets.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
              High Priority Interventions Needed
            </Typography>
            <Grid container spacing={2}>
              {highRiskCadets.map((cadet) => (
                <Grid item xs={12} md={6} key={cadet.cadet_id}>
                  <Paper
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => handleCadetClick(cadet)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'error.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">
                          {cadet.cadet_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Risk Score: {cadet.risk_score}% | Confidence: {cadet.confidence}%
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressValue(cadet.risk_score)}
                      color="error"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2">
                      Primary intervention: {cadet.interventions[0] || 'Assessment needed'}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* All Cadets List */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Cadet Risk Assessments
          </Typography>
          <List>
            {predictions.map((cadet) => (
              <ListItem
                key={cadet.cadet_id}
                button
                onClick={() => handleCadetClick(cadet)}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: getRiskColor(cadet.risk_level) + '.main' }}>
                    {getRiskIcon(cadet.risk_level)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={cadet.cadet_name}
                  secondary={
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          label={`${cadet.risk_level} risk`}
                          size="small"
                          color={getRiskColor(cadet.risk_level)}
                        />
                        <Chip
                          label={`${cadet.risk_score}% risk score`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${cadet.confidence}% confidence`}
                          size="small"
                          color="info"
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Cadet Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedCadet?.cadet_name} - Behavioral Risk Analysis
        </DialogTitle>
        <DialogContent>
          {selectedCadet && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Risk Assessment
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">Overall Risk Score</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getProgressValue(selectedCadet.risk_score)}
                        color={getRiskColor(selectedCadet.risk_level)}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">
                        {selectedCadet.risk_score}% ({selectedCadet.risk_level} risk)
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      AI Confidence: {selectedCadet.confidence}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Risk Factors
                    </Typography>
                    {Object.entries(selectedCadet.factors).map(([factor, score]) => (
                      <Box key={factor} sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {factor.replace(/([A-Z])/g, ' $1')}: {score}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <InterventionIcon sx={{ mr: 1 }} />
                  Recommended Interventions
                </Typography>
                <List>
                  {selectedCadet.interventions.map((intervention, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <InterventionIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={intervention} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" color="primary">
            Create Intervention Plan
          </Button>
        </DialogActions>
      </Dialog>

      {predictions.length === 0 && (
        <Alert severity="info">
          No cadet data available for behavior prediction. Ensure cadets are enrolled and have behavioral tracking data.
        </Alert>
      )}
    </Box>
  );
};
