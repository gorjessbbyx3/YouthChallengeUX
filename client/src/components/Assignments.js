
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Edit,
  Create,
  Show,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  ReferenceInput,
  SimpleShowLayout,
  Filter,
  SearchInput,
  ReferenceField,
  FunctionField,
  useRecordContext
} from 'react-admin';
import { Chip } from '@mui/material';

const AssignmentFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search assignments" source="q" alwaysOn />
    <ReferenceInput source="cadet_id" reference="cadets">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <SelectInput 
      source="status" 
      choices={[
        { id: 'pending', name: 'Pending' },
        { id: 'in_progress', name: 'In Progress' },
        { id: 'completed', name: 'Completed' },
        { id: 'overdue', name: 'Overdue' }
      ]} 
    />
    <SelectInput 
      source="type" 
      choices={[
        { id: 'academic', name: 'Academic' },
        { id: 'behavioral', name: 'Behavioral' },
        { id: 'community_service', name: 'Community Service' },
        { id: 'physical_training', name: 'Physical Training' }
      ]} 
    />
  </Filter>
);

const StatusField = () => {
  const record = useRecordContext();
  if (!record) return null;
  
  const getColor = (status) => {
    switch(status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'overdue': return 'error';
      case 'pending': return 'warning';
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

export const AssignmentList = (props) => (
  <List {...props} filters={<AssignmentFilter />}>
    <Datagrid rowClick="show">
      <TextField source="title" />
      <ReferenceField source="cadet_id" reference="cadets">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="type" />
      <FunctionField 
        source="status" 
        render={record => <StatusField />}
        label="Status"
      />
      <DateField source="due_date" />
      <DateField source="assigned_date" />
    </Datagrid>
  </List>
);

export const AssignmentEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="title" required />
      <TextInput source="description" multiline />
      <ReferenceInput source="cadet_id" reference="cadets" required>
        <SelectInput optionText="name" />
      </ReferenceInput>
      <SelectInput 
        source="type" 
        choices={[
          { id: 'academic', name: 'Academic' },
          { id: 'behavioral', name: 'Behavioral' },
          { id: 'community_service', name: 'Community Service' },
          { id: 'physical_training', name: 'Physical Training' }
        ]} 
        required 
      />
      <SelectInput 
        source="status" 
        choices={[
          { id: 'pending', name: 'Pending' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'completed', name: 'Completed' },
          { id: 'overdue', name: 'Overdue' }
        ]} 
        required 
      />
      <DateInput source="due_date" required />
      <TextInput source="completion_notes" multiline />
    </SimpleForm>
  </Edit>
);

export const AssignmentCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="title" required />
      <TextInput source="description" multiline />
      <ReferenceInput source="cadet_id" reference="cadets" required>
        <SelectInput optionText="name" />
      </ReferenceInput>
      <SelectInput 
        source="type" 
        choices={[
          { id: 'academic', name: 'Academic' },
          { id: 'behavioral', name: 'Behavioral' },
          { id: 'community_service', name: 'Community Service' },
          { id: 'physical_training', name: 'Physical Training' }
        ]} 
        required 
      />
      <DateInput source="due_date" required />
      <TextInput source="requirements" multiline />
    </SimpleForm>
  </Create>
);

export const AssignmentShow = (props) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="title" />
      <TextField source="description" />
      <ReferenceField source="cadet_id" reference="cadets">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="type" />
      <FunctionField 
        source="status" 
        render={record => <StatusField />}
        label="Status"
      />
      <DateField source="assigned_date" />
      <DateField source="due_date" />
      <DateField source="completed_date" />
      <TextField source="requirements" />
      <TextField source="completion_notes" />
    </SimpleShowLayout>
  </Show>
);
