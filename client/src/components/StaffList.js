
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  FunctionField,
  Filter,
  SearchInput,
  SelectInput,
  EditButton
} from 'react-admin';
import { Chip } from '@mui/material';

const StaffFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search by name" source="q" alwaysOn />
    <SelectInput 
      source="department" 
      choices={[
        { id: 'administration', name: 'Administration' },
        { id: 'academic', name: 'Academic' },
        { id: 'behavioral', name: 'Behavioral' },
        { id: 'support', name: 'Support' }
      ]} 
    />
    <SelectInput 
      source="role" 
      choices={[
        { id: 'director', name: 'Director' },
        { id: 'instructor', name: 'Instructor' },
        { id: 'counselor', name: 'Counselor' },
        { id: 'support', name: 'Support Staff' }
      ]} 
    />
  </Filter>
);

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'leave': return 'warning';
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

export const StaffList = (props) => (
  <List {...props} filters={<StaffFilter />}>
    <Datagrid>
      <TextField source="first_name" />
      <TextField source="last_name" />
      <EmailField source="email" />
      <TextField source="role" />
      <TextField source="department" />
      <FunctionField 
        source="status" 
        render={record => <StatusField record={record} />}
      />
      <DateField source="hire_date" />
      <EditButton />
    </Datagrid>
  </List>
);
