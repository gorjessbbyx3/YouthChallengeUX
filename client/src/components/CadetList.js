import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  EditButton,
  DeleteButton,
  ShowButton,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  SearchInput,
  SelectInput,
  ReferenceField,
  useRefresh
} from 'react-admin';
import { 
  Chip, 
  Box, 
  Alert, 
  Typography, 
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AIIcon,
  TrendingUp as TrendIcon
} from '@mui/icons-material';
import axios from 'axios';

const CadetFilters = [
  <SearchInput key="search" source="q" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={[
      { id: 'active', name: 'Active' },
      { id: 'graduated', name: 'Graduated' },
      { id: 'withdrawn', name: 'Withdrawn' }
    ]}
  />,
  <SelectInput
    key="hiset_status"
    source="hiset_status"
    choices={[
      { id: 'Not Started', name: 'Not Started' },
      { id: 'In Progress', name: 'In Progress' },
      { id: 'Completed', name: 'Completed' }
    ]}
  />,
  <SelectInput
    key="risk_level"
    source="behavior_score"
    label="Risk Level"
    choices={[
      { id: 1, name: 'High Risk (1-2)' },
      { id: 3, name: 'Medium Risk (3)' },
      { id: 4, name: 'Low Risk (4-5)' }
    ]}
  />
];

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'graduated': return 'primary';
      case 'withdrawn': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip 
      label={record.status} 
      color={getColor(record.status)}
      size="small"
    />
  );
};

const BehaviorScoreField = ({ record }) => {
  const getColor = (score) => {
    if (score <= 2) return 'error';
    if (score <= 3) return 'warning';
    return 'success';
  };

  const getRiskText = (score) => {
    if (score <= 2) return 'High Risk';
    if (score <= 3) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Tooltip title={`${getRiskText(record.behavior_score)} - Score: ${record.behavior_score}/5`}>
      <Chip 
        label={`${record.behavior_score}/5`} 
        color={getColor(record.behavior_score)}
        size="small"
      />
    </Tooltip>
  );
};

const RiskPredictionField = ({ record }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (record.behavior_score <= 3) {
      fetchPrediction();
    }
  }, [record.id]);

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      // Simulated AI prediction based on behavior patterns
      const riskScore = calculateRiskScore(record);
      setPrediction(riskScore);
    } catch (error) {
      console.error('Error fetching prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = (cadet) => {
    // AI-like calculation based on multiple factors
    let riskScore = 0;

    // Behavior score impact (inverted - lower score = higher risk)
    riskScore += (5 - cadet.behavior_score) * 20;

    // Age factor (younger cadets might have different risk patterns)
    if (cadet.age < 16) riskScore += 10;
    if (cadet.age > 18) riskScore -= 5;

    // Academic progress factor
    if (cadet.hiset_status === 'Not Started') riskScore += 15;
    if (cadet.hiset_status === 'Completed') riskScore -= 10;

    // Enrollment duration (newer cadets might be at higher risk)
    const enrollmentDate = new Date(cadet.enrollment_date);
    const daysSinceEnrollment = (new Date() - enrollmentDate) / (1000 * 60 * 60 * 24);
    if (daysSinceEnrollment < 30) riskScore += 10;

    // Cap at 100%
    return Math.min(100, Math.max(0, riskScore));
  };

  if (loading) {
    return <CircularProgress size={20} />;
  }

  if (!prediction || record.behavior_score > 3) {
    return <Typography variant="caption">-</Typography>;
  }

  const getColor = (score) => {
    if (score >= 70) return 'error';
    if (score >= 40) return 'warning';
    return 'success';
  };

  return (
    <Tooltip title={`AI-predicted conflict risk: ${prediction}%`}>
      <Chip 
        label={`${prediction}%`}
        color={getColor(prediction)}
        size="small"
        icon={<AIIcon />}
      />
    </Tooltip>
  );
};

const BehaviorInsightsPanel = () => {
  const [highRiskCadets, setHighRiskCadets] = useState([]);
  const [psychologyInsights, setPsychologyInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBehaviorInsights();
  }, []);

  const fetchBehaviorInsights = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/cadets');
      const cadets = response.data;

      // Identify high-risk cadets
      const highRisk = cadets.filter(c => c.behavior_score <= 2 && c.status === 'active');
      setHighRiskCadets(highRisk);

      // Generate psychology-based insights
      const insights = generatePsychologyInsights(cadets);
      setPsychologyInsights(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePsychologyInsights = (cadets) => {
    const activeCadets = cadets.filter(c => c.status === 'active');
    const insights = [];

    // Peer grouping analysis
    const highRiskCount = activeCadets.filter(c => c.behavior_score <= 2).length;
    const lowRiskCount = activeCadets.filter(c => c.behavior_score >= 4).length;

    if (highRiskCount > 0 && lowRiskCount > 0) {
      insights.push({
        type: 'peer_pairing',
        title: 'Peer Mentorship Opportunity',
        description: `${highRiskCount} high-risk cadets could benefit from pairing with ${lowRiskCount} positive peer models`,
        impact: 'Social Learning Theory - positive behavior modeling'
      });
    }

    // Academic-behavior correlation
    const strugglingAcademically = activeCadets.filter(c => 
      c.hiset_status === 'Not Started' && c.behavior_score <= 3
    ).length;

    if (strugglingAcademically > 0) {
      insights.push({
        type: 'academic_intervention',
        title: 'Academic Support Needed',
        description: `${strugglingAcademically} cadets showing both academic and behavioral challenges`,
        impact: 'Self-Determination Theory - build competence to improve motivation'
      });
    }

    return insights;
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* High Risk Alerts */}
      {highRiskCadets.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            <WarningIcon sx={{ mr: 1 }} />
            High-Risk Cadets Requiring Attention ({highRiskCadets.length})
          </Typography>
          {highRiskCadets.slice(0, 3).map((cadet, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
              • {cadet.first_name} {cadet.last_name} - Behavior Score: {cadet.behavior_score}/5
            </Typography>
          ))}
        </Alert>
      )}

      {/* Psychology Insights */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <PsychologyIcon sx={{ mr: 1, color: 'primary.main' }} />
            AI Behavior Insights & Interventions
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {psychologyInsights.map((insight, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {insight.description}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      Psychology Framework: {insight.impact}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {psychologyInsights.length === 0 && (
              <Grid item xs={12}>
                <Alert severity="success">
                  No critical behavioral patterns detected. Continue monitoring for early intervention opportunities.
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

export const CadetList = (props) => (
  <Box>
    <BehaviorInsightsPanel />
    <List
      {...props}
      filters={CadetFilters}
      actions={<ListActions />}
      sort={{ field: 'behavior_score', order: 'ASC' }}
    >
      <Datagrid>
        <TextField source="first_name" />
        <TextField source="last_name" />
        <NumberField source="age" />
        <StatusField />
        <BehaviorScoreField />
        <RiskPredictionField />
        <TextField source="hiset_status" />
        <TextField source="placement_status" />
        <DateField source="enrollment_date" />
        <ShowButton />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  </Box>
);