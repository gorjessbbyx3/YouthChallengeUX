
import React from 'react';
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
  useRecordContext
} from 'react-admin';
import { Chip } from '@mui/material';

const InventoryFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search items" source="q" alwaysOn />
    <SelectInput 
      source="category" 
      choices={[
        { id: 'uniforms', name: 'Uniforms' },
        { id: 'textbooks', name: 'Textbooks' },
        { id: 'equipment', name: 'Equipment' },
        { id: 'supplies', name: 'Supplies' }
      ]} 
    />
  </Filter>
);

const StockStatusField = () => {
  const record = useRecordContext();
  if (!record) return null;
  
  const isLowStock = record.quantity <= record.threshold;
  
  return (
    <Chip 
      label={isLowStock ? 'Low Stock' : 'In Stock'}
      color={isLowStock ? 'error' : 'success'}
      size="small"
    />
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
          { id: 'textbooks', name: 'Textbooks' },
          { id: 'equipment', name: 'Equipment' },
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
          { id: 'textbooks', name: 'Textbooks' },
          { id: 'equipment', name: 'Equipment' },
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
