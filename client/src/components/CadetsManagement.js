
import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  DateInput,
  SelectInput,
  Filter,
  SearchInput,
  FunctionField,
  useRecordContext,
  Show,
  SimpleShowLayout
} from 'react-admin';
import { 
  Chip, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Alert, 
  Box,
  LinearProgress,
  Avatar,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import axios from 'axios';

const CadetFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search cadets" source="q" alwaysOn />
    <SelectInput 
      source="platoon" 
      choices={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'bravo', name: 'Bravo' },
        { id: 'charlie', name: 'Charlie' },
        { id: 'delta', name: 'Delta' }
      ]} 
    />
    <SelectInput 
      source="hiset_status" 
      choices={[
        { id: 'not_started', name: 'Not Started' },
        { id: 'in_progress', name: 'In Progress' },
        { id: 'completed', name: 'Completed' }
      ]} 
    />
    <SelectInput 
      source="behavior_score" 
      choices={[
        { id: '1', name: 'Excellent (1)' },
        { id: '2', name: 'Good (2)' },
        { id: '3', name: 'Average (3)' },
        { id: '4', name: 'Concerning (4)' },
        { id: '5', name: 'High Risk (5)' }
      ]} 
    />
  </Filter>
);

const BehaviorScoreField = () => {
  const record = useRecordContext();
  if (!record) return null;
  
  const score = record.behavior_score || 1;
  const getColor = () => {
    if (score <= 2) return 'success';
    if (score === 3) return 'warning';
    return 'error';
  };
  
  const getLabel = () => {
    const labels = {
      1: 'Excellent',
      2: 'Good', 
      3: 'Average',
      4: 'Concerning',
      5: 'High Risk'
    };
    return `${labels[score]} (${score})`;
  };
  
  return (
    <Chip 
      label={getLabel()}
      color={getColor()}
      size="small"
    />
  );
};

const RiskPredictionField = () => {
  const record = useRecordContext();
  if (!record) return null;
  
  const risk = record.risk_prediction || 0;
  const getRiskColor = () => {
    if (risk < 30) return 'success';
    if (risk < 70) return 'warning';
    return 'error';
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress 
        variant="determinate" 
        value={risk}
        color={getRiskColor()}
        sx={{ width: 60, height: 8 }}
      />
      <Typography variant="body2" color={getRiskColor() + '.main'}>
        {risk}%
      </Typography>
    </Box>
  );
};

const CadetDashboard = () => {
  const [cadets, setCadets] = useState([]);
  const [stats, setStats] = useState({});
  const [tabValue, setTabValue] = useState(0);
  
  useEffect(() => {
    fetchCadetData();
  }, []);
  
  const fetchCadetData = async () => {
    try {
      const token = localStorage.getItem('auth');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [cadetsRes, behaviorRes] = await Promise.all([
        axios.get('/api/cadets', { headers }),
        axios.get('/api/ai/behavior-prediction', { headers })
      ]);
      
      const cadetsData = cadetsRes.data;
      const behaviorData = behaviorRes.data;
      
      // Merge behavior predictions with cadet data
      const enhancedCadets = cadetsData.map(cadet => ({
        ...cadet,
        risk_prediction: behaviorData.find(b => b.cadet_id === cadet.id)?.risk_score || 0
      }));
      
      setCadets(enhancedCadets);
      
      // Calculate statistics
      const total = enhancedCadets.length;
      const highRisk = enhancedCadets.filter(c => c.behavior_score >= 4).length;
      const hisetCompleted = enhancedCadets.filter(c => c.hiset_status === 'completed').length;
      const workforceReady = enhancedCadets.filter(c => c.placement_status === 'workforce').length;
      
      setStats({
        total,
        highRisk,
        hisetCompleted,
        workforceReady,
        hisetRate: total > 0 ? ((hisetCompleted / total) * 100).toFixed(1) : 0,
        workforceRate: total > 0 ? ((workforceReady / total) * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Error fetching cadet data:', error);
    }
  };
  
  const highRiskCadets = cadets.filter(c => c.behavior_score >= 4 || c.risk_prediction >= 70);
  const excellentCadets = cadets.filter(c => c.behavior_score <= 2 && c.risk_prediction < 30);
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        👥 Cadet Management & Behavior Analytics
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Psychology Integration:</strong> Using social learning theory to pair high-risk cadets 
          with positive role models, reducing "bad apples" effect and improving outcomes.
        </Typography>
      </Alert>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Cadets</Typography>
              <Typography variant="h3" color="primary">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">High Risk</Typography>
              <Typography variant="h3" color="error">{stats.highRisk}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">HiSET Completion</Typography>
              <Typography variant="h3" color="success">{stats.hisetRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Workforce Placement</Typography>
              <Typography variant="h3" color="info">{stats.workforceRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="High Risk Intervention" />
        <Tab label="Positive Role Models" />
        <Tab label="Pairing Recommendations" />
      </Tabs>
      
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {highRiskCadets.map(cadet => (
            <Grid item xs={12} md={6} key={cadet.id}>
              <Card sx={{ border: '2px solid #f44336' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      {cadet.first_name[0]}{cadet.last_name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {cadet.first_name} {cadet.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Platoon: {cadet.platoon} | Risk: {cadet.risk_prediction}%
                      </Typography>
                      <BehaviorScoreField />
                    </Box>
                  </Box>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Requires immediate intervention and positive peer pairing
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {excellentCadets.map(cadet => (
            <Grid item xs={12} md={6} key={cadet.id}>
              <Card sx={{ border: '2px solid #4caf50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      {cadet.first_name[0]}{cadet.last_name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {cadet.first_name} {cadet.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Platoon: {cadet.platoon} | Risk: {cadet.risk_prediction}%
                      </Typography>
                      <BehaviorScoreField />
                    </Box>
                  </Box>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Excellent role model - ideal for mentoring high-risk cadets
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {tabValue === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            🤝 Recommended Pairings (Social Learning Theory)
          </Typography>
          {highRiskCadets.map(highRisk => {
            const mentor = excellentCadets.find(excellent => 
              excellent.platoon === highRisk.platoon
            ) || excellentCadets[0];
            
            return mentor ? (
              <Card key={highRisk.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'error.main' }}>
                          {highRisk.first_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {highRisk.first_name} {highRisk.last_name}
                          </Typography>
                          <Typography variant="caption" color="error">
                            High Risk ({highRisk.behavior_score})
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={2} sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">↔️</Typography>
                      <Typography variant="caption">Pair</Typography>
                    </Grid>
                    <Grid item xs={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          {mentor.first_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {mentor.first_name} {mentor.last_name}
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            Role Model ({mentor.behavior_score})
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ) : null;
          })}
        </Paper>
      )}
    </Box>
  );
};

export const CadetList = (props) => (
  <List {...props} filters={<CadetFilter />}>
    <Datagrid rowClick="show">
      <TextField source="first_name" />
      <TextField source="last_name" />
      <TextField source="platoon" />
      <FunctionField 
        source="behavior_score" 
        render={record => <BehaviorScoreField />}
        label="Behavior"
      />
      <TextField source="hiset_status" label="HiSET Status" />
      <TextField source="placement_status" label="Placement" />
      <FunctionField 
        source="risk_prediction" 
        render={record => <RiskPredictionField />}
        label="AI Risk"
      />
      <DateField source="enrollment_date" />
    </Datagrid>
  </List>
);

export const CadetEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="first_name" required />
      <TextInput source="last_name" required />
      <DateInput source="date_of_birth" />
      <TextInput source="phone" />
      <TextInput source="email" />
      <SelectInput 
        source="platoon" 
        choices={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'bravo', name: 'Bravo' },
          { id: 'charlie', name: 'Charlie' },
          { id: 'delta', name: 'Delta' }
        ]} 
        required 
      />
      <SelectInput 
        source="behavior_score" 
        choices={[
          { id: 1, name: '1 - Excellent' },
          { id: 2, name: '2 - Good' },
          { id: 3, name: '3 - Average' },
          { id: 4, name: '4 - Concerning' },
          { id: 5, name: '5 - High Risk' }
        ]} 
        required 
      />
      <SelectInput 
        source="hiset_status" 
        choices={[
          { id: 'not_started', name: 'Not Started' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'completed', name: 'Completed' }
        ]} 
        required 
      />
      <SelectInput 
        source="placement_status" 
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'workforce', name: 'Workforce' },
          { id: 'education', name: 'Education' },
          { id: 'military', name: 'Military' }
        ]} 
      />
      <TextInput source="emergency_contact_name" />
      <TextInput source="emergency_contact_phone" />
    </SimpleForm>
  </Edit>
);

export const CadetCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="first_name" required />
      <TextInput source="last_name" required />
      <DateInput source="date_of_birth" />
      <TextInput source="phone" />
      <TextInput source="email" />
      <SelectInput 
        source="platoon" 
        choices={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'bravo', name: 'Bravo' },
          { id: 'charlie', name: 'Charlie' },
          { id: 'delta', name: 'Delta' }
        ]} 
        required 
      />
      <SelectInput 
        source="behavior_score" 
        choices={[
          { id: 1, name: '1 - Excellent' },
          { id: 2, name: '2 - Good' },
          { id: 3, name: '3 - Average' },
          { id: 4, name: '4 - Concerning' },
          { id: 5, name: '5 - High Risk' }
        ]} 
        defaultValue={3}
        required 
      />
      <SelectInput 
        source="hiset_status" 
        choices={[
          { id: 'not_started', name: 'Not Started' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'completed', name: 'Completed' }
        ]} 
        defaultValue="not_started"
        required 
      />
      <TextInput source="emergency_contact_name" />
      <TextInput source="emergency_contact_phone" />
    </SimpleForm>
  </Create>
);

export const CadetShow = (props) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="first_name" />
      <TextField source="last_name" />
      <TextField source="platoon" />
      <FunctionField 
        source="behavior_score" 
        render={record => <BehaviorScoreField />}
        label="Behavior Score"
      />
      <TextField source="hiset_status" />
      <TextField source="placement_status" />
      <DateField source="enrollment_date" />
      <TextField source="emergency_contact_name" />
      <TextField source="emergency_contact_phone" />
    </SimpleShowLayout>
  </Show>
);

export { CadetDashboard };
