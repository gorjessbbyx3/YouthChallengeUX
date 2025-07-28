
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
  BulkDeleteButton,
  EditButton,
  ShowButton
} from 'react-admin';
import { Chip } from '@mui/material';

const CadetFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search by name" source="q" alwaysOn />
    <SelectInput 
      source="status" 
      choices={[
        { id: 'active', name: 'Active' },
        { id: 'graduated', name: 'Graduated' },
        { id: 'dropped', name: 'Dropped' }
      ]} 
    />
    <SelectInput 
      source="risk_level" 
      choices={[
        { id: 'low', name: 'Low Risk' },
        { id: 'medium', name: 'Medium Risk' },
        { id: 'high', name: 'High Risk' }
      ]} 
    />
  </Filter>
);

const RiskLevelField = ({ record }) => {
  const getColor = (level) => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip 
      label={record?.risk_level} 
      color={getColor(record?.risk_level)}
      size="small"
    />
  );
};

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'active': return 'primary';
      case 'graduated': return 'success';
      case 'dropped': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip 
      label={record?.status} 
      color={getColor(record?.status)}
      size="small"
    />
  );
};

const CadetBulkActionButtons = () => (
  <>
    <BulkDeleteButton />
  </>
);

export const CadetList = (props) => (
  <List {...props} filters={<CadetFilter />} bulkActionButtons={<CadetBulkActionButtons />}>
    <Datagrid>
      <TextField source="first_name" />
      <TextField source="last_name" />
      <DateField source="date_of_birth" />
      <FunctionField 
        source="status" 
        render={record => <StatusField record={record} />}
      />
      <FunctionField 
        source="risk_level" 
        render={record => <RiskLevelField record={record} />}
      />
      <NumberField source="behavior_score" />
      <NumberField source="academic_score" />
      <TextField source="placement_status" />
      <ShowButton />
      <EditButton />
    </Datagrid>
  </List>
);
