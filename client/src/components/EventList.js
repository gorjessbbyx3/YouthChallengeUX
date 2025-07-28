
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  FunctionField,
  Filter,
  SearchInput,
  SelectInput,
  EditButton
} from 'react-admin';
import { Chip } from '@mui/material';

const EventFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search events" source="q" alwaysOn />
    <SelectInput 
      source="type" 
      choices={[
        { id: 'ceremony', name: 'Ceremony' },
        { id: 'training', name: 'Training' },
        { id: 'field_trip', name: 'Field Trip' },
        { id: 'community_service', name: 'Community Service' },
        { id: 'assessment', name: 'Assessment' }
      ]} 
    />
    <SelectInput 
      source="status" 
      choices={[
        { id: 'planned', name: 'Planned' },
        { id: 'active', name: 'Active' },
        { id: 'completed', name: 'Completed' },
        { id: 'cancelled', name: 'Cancelled' }
      ]} 
    />
  </Filter>
);

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'planned': return 'info';
      case 'active': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
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

export const EventList = (props) => (
  <List {...props} filters={<EventFilter />}>
    <Datagrid>
      <TextField source="title" />
      <TextField source="type" />
      <DateField source="start_date" />
      <DateField source="end_date" />
      <TextField source="location" />
      <NumberField source="capacity" />
      <FunctionField 
        source="status" 
        render={record => <StatusField record={record} />}
      />
      <EditButton />
    </Datagrid>
  </List>
);
