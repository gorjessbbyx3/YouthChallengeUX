
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  Filter,
  SearchInput,
  SelectInput,
  EditButton
} from 'react-admin';
import { Chip } from '@mui/material';

const InventoryFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search items" source="q" alwaysOn />
    <SelectInput 
      source="category" 
      choices={[
        { id: 'uniforms', name: 'Uniforms' },
        { id: 'supplies', name: 'Supplies' },
        { id: 'equipment', name: 'Equipment' },
        { id: 'educational', name: 'Educational' }
      ]} 
    />
  </Filter>
);

const StockStatusField = ({ record }) => {
  const quantity = record?.quantity || 0;
  const threshold = record?.threshold || 0;
  
  const getColor = () => {
    if (quantity === 0) return 'error';
    if (quantity <= threshold) return 'warning';
    return 'success';
  };

  const getLabel = () => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <Chip 
      label={getLabel()} 
      color={getColor()}
      size="small"
    />
  );
};

export const InventoryList = (props) => (
  <List {...props} filters={<InventoryFilter />}>
    <Datagrid>
      <TextField source="name" />
      <TextField source="category" />
      <NumberField source="quantity" />
      <NumberField source="threshold" />
      <FunctionField 
        source="stock_status" 
        render={record => <StockStatusField record={record} />}
      />
      <TextField source="location" />
      <DateField source="last_updated" />
      <EditButton />
    </Datagrid>
  </List>
);
