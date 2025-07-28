
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  ReferenceField,
  DateField,
  FunctionField,
  Filter,
  ReferenceInput,
  SelectInput,
  EditButton
} from 'react-admin';
import { Chip } from '@mui/material';

const MentorshipFilter = (props) => (
  <Filter {...props}>
    <ReferenceInput source="cadet_id" reference="cadets">
      <SelectInput optionText="first_name" />
    </ReferenceInput>
    <ReferenceInput source="mentor_id" reference="staff">
      <SelectInput optionText="first_name" />
    </ReferenceInput>
    <SelectInput 
      source="status" 
      choices={[
        { id: 'active', name: 'Active' },
        { id: 'completed', name: 'Completed' },
        { id: 'paused', name: 'Paused' }
      ]} 
    />
  </Filter>
);

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'paused': return 'warning';
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

export const MentorshipList = (props) => (
  <List {...props} filters={<MentorshipFilter />}>
    <Datagrid>
      <ReferenceField source="cadet_id" reference="cadets">
        <TextField source="first_name" />
      </ReferenceField>
      <ReferenceField source="mentor_id" reference="staff">
        <TextField source="first_name" />
      </ReferenceField>
      <FunctionField 
        source="status" 
        render={record => <StatusField record={record} />}
      />
      <DateField source="start_date" />
      <DateField source="end_date" />
      <TextField source="goals" />
      <EditButton />
    </Datagrid>
  </List>
);
