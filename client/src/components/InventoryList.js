import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  EditButton,
  DeleteButton,
  Create,
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  Show,
  SimpleShowLayout,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  SearchInput,
  useRefresh,
  Button
} from 'react-admin';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as ForecastIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import axios from 'axios';

const InventoryFilters = [
  <SearchInput key="search" source="q" alwaysOn />,
  <SelectInput
    key="category"
    source="category"
    choices={[
      { id: 'uniforms', name: 'Uniforms' },
      { id: 'hiset_books', name: 'HiSET Books' },
      { id: 'training_equipment', name: 'Training Equipment' },
      { id: 'supplies', name: 'Supplies' }
    ]}
  />,
  <SelectInput
    key="stock_status"
    source="stock_status"
    choices={[
      { id: 'critical', name: 'Critical' },
      { id: 'low', name: 'Low Stock' },
      { id: 'normal', name: 'Normal' }
    ]}
  />
];

const StockStatusField = ({ record }) => {
  const { quantity, threshold } = record;

  if (quantity === 0) {
    return <Chip label="Out of Stock" color="error" size="small" />;
  } else if (quantity <= threshold * 0.5) {
    return <Chip label="Critical" color="error" size="small" />;
  } else if (quantity <= threshold) {
    return <Chip label="Low Stock" color="warning" size="small" />;
  } else {
    return <Chip label="In Stock" color="success" size="small" />;
  }
};

const ForecastingPanel = () => {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchForecasts();
    fetchAlerts();
  }, []);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/inventory/forecasting/predictions');
      setForecasts(response.data.predictions || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/inventory/alerts');
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            <WarningIcon sx={{ mr: 1 }} />
            Urgent Inventory Alerts ({alerts.length})
          </Typography>
          {alerts.slice(0, 3).map((alert, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
              • {alert.name}: {alert.quantity} left (threshold: {alert.threshold}) - {alert.alert_level}
            </Typography>
          ))}
        </Alert>
      )}

      {/* AI Forecasting */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
            AI Inventory Forecasting
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {forecasts.slice(0, 6).map((forecast, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      {forecast.item_name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Current: {forecast.current_quantity}</Typography>
                      <Chip 
                        label={forecast.forecast?.risk_level || 'low'} 
                        color={getRiskColor(forecast.forecast?.risk_level)}
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Days until reorder: {forecast.forecast?.days_until_threshold || 'N/A'}
                    </Typography>
                    {forecast.recommendations?.slice(0, 2).map((rec, i) => (
                      <Typography key={i} variant="caption" display="block" sx={{ mb: 0.5 }}>
                        • {rec}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

const UsageDialog = ({ open, onClose, item, onRecord }) => {
  const [quantity, setQuantity] = useState('');
  const [purpose, setPurpose] = useState('');

  const handleRecord = () => {
    onRecord(item.id, {
      quantity_used: parseInt(quantity),
      purpose,
      staff_id: 1 // Current user ID
    });
    setQuantity('');
    setPurpose('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Usage - {item?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <MuiTextField
            fullWidth
            label="Quantity Used"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            sx={{ mb: 2 }}
          />
          <MuiTextField
            fullWidth
            label="Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleRecord} variant="contained" disabled={!quantity}>
          Record Usage
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RestockDialog = ({ open, onClose, item, onRestock }) => {
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');

  const handleRestock = () => {
    onRestock(item.id, {
      quantity_added: parseInt(quantity),
      cost: parseFloat(cost) || 0,
      supplier,
      staff_id: 1 // Current user ID
    });
    setQuantity('');
    setCost('');
    setSupplier('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Restock Item - {item?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <MuiTextField
            fullWidth
            label="Quantity Added"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            sx={{ mb: 2 }}
          />
          <MuiTextField
            fullWidth
            label="Total Cost"
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            sx={{ mb: 2 }}
          />
          <MuiTextField
            fullWidth
            label="Supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleRestock} variant="contained" disabled={!quantity}>
          Record Restock
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const InventoryActions = ({ record }) => {
  const [usageDialog, setUsageDialog] = useState(false);
  const [restockDialog, setRestockDialog] = useState(false);
  const refresh = useRefresh();

  const handleUsage = async (itemId, data) => {
    try {
      await axios.post(`/api/inventory/${itemId}/usage`, data);
      refresh();
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  const handleRestock = async (itemId, data) => {
    try {
      await axios.post(`/api/inventory/${itemId}/restock`, data);
      refresh();
    } catch (error) {
      console.error('Error recording restock:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        size="small"
        startIcon={<RemoveIcon />}
        onClick={() => setUsageDialog(true)}
      >
        Use
      </Button>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setRestockDialog(true)}
      >
        Restock
      </Button>

      <UsageDialog
        open={usageDialog}
        onClose={() => setUsageDialog(false)}
        item={record}
        onRecord={handleUsage}
      />

      <RestockDialog
        open={restockDialog}
        onClose={() => setRestockDialog(false)}
        item={record}
        onRestock={handleRestock}
      />
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

export const InventoryList = (props) => (
  <Box>
    <ForecastingPanel />
    <List
      {...props}
      filters={InventoryFilters}
      actions={<ListActions />}
      sort={{ field: 'stock_status', order: 'DESC' }}
    >
      <Datagrid>
        <TextField source="name" />
        <TextField source="category" />
        <NumberField source="quantity" />
        <NumberField source="threshold" />
        <StockStatusField />
        <NumberField source="unit_cost" options={{ style: 'currency', currency: 'USD' }} />
        <InventoryActions />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  </Box>
);