
import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  Filter,
  SearchInput,
  FunctionField,
  useRecordContext,
  Button
} from 'react-admin';
import { 
  Chip, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Alert, 
  Box,
  Paper,
  LinearProgress
} from '@mui/material';
import axios from 'axios';

const InventoryFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search items" source="q" alwaysOn />
    <SelectInput 
      source="category" 
      choices={[
        { id: 'uniforms', name: 'Uniforms' },
        { id: 'textbooks', name: 'HiSET Books' },
        { id: 'equipment', name: 'Training Equipment' },
        { id: 'supplies', name: 'Supplies' }
      ]} 
    />
  </Filter>
);

const StockStatusField = () => {
  const record = useRecordContext();
  if (!record) return null;
  
  const isLowStock = record.quantity <= record.threshold;
  const isOutOfStock = record.quantity === 0;
  
  return (
    <Chip 
      label={isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
      color={isOutOfStock ? 'error' : isLowStock ? 'warning' : 'success'}
      size="small"
    />
  );
};

const ForecastCard = ({ item }) => {
  const daysUntilEmpty = item.usage_rate > 0 ? Math.floor(item.quantity / item.usage_rate) : 999;
  const needsReorder = daysUntilEmpty <= 14;
  
  return (
    <Card sx={{ mb: 2, border: needsReorder ? '2px solid #ff9800' : '1px solid #e0e0e0' }}>
      <CardContent>
        <Typography variant="h6">{item.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Category: {item.category}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            Current Stock: {item.quantity} | Threshold: {item.threshold}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(item.quantity / (item.threshold * 2)) * 100}
            sx={{ mt: 1, mb: 1 }}
            color={item.quantity <= item.threshold ? 'warning' : 'success'}
          />
          <Typography variant="body2" color={needsReorder ? 'warning.main' : 'text.secondary'}>
            {daysUntilEmpty < 999 ? `${daysUntilEmpty} days until reorder needed` : 'Stable stock level'}
          </Typography>
          {needsReorder && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Reorder recommended within {daysUntilEmpty} days
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const InventoryKanban = () => {
  const [inventory, setInventory] = useState([]);
  const [forecast, setForecast] = useState([]);
  
  useEffect(() => {
    fetchInventoryData();
  }, []);
  
  const fetchInventoryData = async () => {
    try {
      const token = localStorage.getItem('auth');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [inventoryRes, forecastRes] = await Promise.all([
        axios.get('/api/inventory', { headers }),
        axios.get('/api/ai/inventory-forecast', { headers })
      ]);
      
      setInventory(inventoryRes.data);
      setForecast(forecastRes.data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };
  
  const inStock = forecast.filter(item => item.quantity > item.threshold);
  const lowStock = forecast.filter(item => item.quantity <= item.threshold && item.quantity > 0);
  const outOfStock = forecast.filter(item => item.quantity === 0);
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        📦 Inventory Management & AI Forecasting
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Psychology Integration:</strong> Reliable inventory supports self-determination theory 
          by ensuring cadets have necessary resources, creating a stable learning environment.
        </Typography>
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#e8f5e8' }}>
            <Typography variant="h6" color="success.main" gutterBottom>
              ✅ In Stock ({inStock.length})
            </Typography>
            {inStock.map(item => (
              <ForecastCard key={item.id} item={item} />
            ))}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
            <Typography variant="h6" color="warning.main" gutterBottom>
              ⚠️ Low Stock ({lowStock.length})
            </Typography>
            {lowStock.map(item => (
              <ForecastCard key={item.id} item={item} />
            ))}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
            <Typography variant="h6" color="error.main" gutterBottom>
              🚨 Out of Stock ({outOfStock.length})
            </Typography>
            {outOfStock.map(item => (
              <ForecastCard key={item.id} item={item} />
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export const InventoryList = (props) => (
  <List {...props} filters={<InventoryFilter />}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <TextField source="category" />
      <NumberField source="quantity" />
      <NumberField source="threshold" />
      <FunctionField 
        source="stock_status" 
        render={record => <StockStatusField />}
        label="Status"
      />
      <NumberField source="unit_cost" options={{ style: 'currency', currency: 'USD' }} />
      <TextField source="supplier" />
      <NumberField source="usage_rate" label="Daily Usage" />
    </Datagrid>
  </List>
);

export const InventoryEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" required />
      <SelectInput 
        source="category" 
        choices={[
          { id: 'uniforms', name: 'Uniforms' },
          { id: 'textbooks', name: 'HiSET Books' },
          { id: 'equipment', name: 'Training Equipment' },
          { id: 'supplies', name: 'Supplies' }
        ]} 
        required 
      />
      <NumberInput source="quantity" required />
      <NumberInput source="threshold" required />
      <NumberInput source="unit_cost" />
      <TextInput source="supplier" />
      <NumberInput source="usage_rate" label="Daily Usage Rate" />
    </SimpleForm>
  </Edit>
);

export const InventoryCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" required />
      <SelectInput 
        source="category" 
        choices={[
          { id: 'uniforms', name: 'Uniforms' },
          { id: 'textbooks', name: 'HiSET Books' },
          { id: 'equipment', name: 'Training Equipment' },
          { id: 'supplies', name: 'Supplies' }
        ]} 
        required 
      />
      <NumberInput source="quantity" required />
      <NumberInput source="threshold" required />
      <NumberInput source="unit_cost" />
      <TextInput source="supplier" />
      <NumberInput source="usage_rate" label="Daily Usage Rate" defaultValue={0} />
    </SimpleForm>
  </Create>
);

export { InventoryKanban };
