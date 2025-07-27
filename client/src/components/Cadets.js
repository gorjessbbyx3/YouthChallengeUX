
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  Edit,
  Create,
  Show,
  SimpleForm,
  TextInput,
  NumberInput,
  DateInput,
  SelectInput,
  SimpleShowLayout,
  FunctionField,
  ChipField,
  Filter,
  SearchInput,
  useRecordContext
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

const RiskLevelField = () => {
  const record = useRecordContext();
  if (!record) return null;
  
  const getColor = (level) => {
    switch(level) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };
  
  return (
    <Chip 
      label={record.risk_level} 
      color={getColor(record.risk_level)}
      size="small"
    />
  );
};

export const CadetList = (props) => (
  <List {...props} filters={<CadetFilter />}>
    <Datagrid rowClick="show">
      <TextField source="name" />
      <TextField source="age" />
      <FunctionField 
        source="risk_level" 
        render={record => <RiskLevelField />}
        label="Risk Level"
      />
      <NumberField source="behavior_score" label="Behavior Score" />
      <ChipField source="status" />
      <TextField source="hiset_status" label="HiSET Status" />
      <TextField source="placement_status" label="Placement" />
      <DateField source="enrollment_date" />
    </Datagrid>
  </List>
);

export const CadetEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" required />
      <NumberInput source="age" required />
      <SelectInput 
        source="status" 
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'graduated', name: 'Graduated' },
          { id: 'dropped', name: 'Dropped' }
        ]} 
        required 
      />
      <SelectInput 
        source="risk_level" 
        choices={[
          { id: 'low', name: 'Low Risk' },
          { id: 'medium', name: 'Medium Risk' },
          { id: 'high', name: 'High Risk' }
        ]} 
        required 
      />
      <NumberInput source="behavior_score" min={1} max={5} />
      <SelectInput 
        source="hiset_status" 
        choices={[
          { id: 'not_started', name: 'Not Started' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'completed', name: 'Completed' }
        ]} 
      />
      <SelectInput 
        source="placement_status" 
        choices={[
          { id: 'workforce', name: 'Workforce' },
          { id: 'education', name: 'Education' },
          { id: 'military', name: 'Military' },
          { id: 'seeking', name: 'Seeking' }
        ]} 
      />
      <TextInput source="birth_date" type="date" />
      <TextInput source="emergency_contact" />
      <TextInput source="medical_notes" multiline />
      <TextInput source="academic_goals" multiline />
      <TextInput source="behavioral_notes" multiline />
    </SimpleForm>
  </Edit>
);

export const CadetCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" required />
      <NumberInput source="age" required />
      <SelectInput 
        source="status" 
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'graduated', name: 'Graduated' },
          { id: 'dropped', name: 'Dropped' }
        ]} 
        defaultValue="active"
        required 
      />
      <SelectInput 
        source="risk_level" 
        choices={[
          { id: 'low', name: 'Low Risk' },
          { id: 'medium', name: 'Medium Risk' },
          { id: 'high', name: 'High Risk' }
        ]} 
        defaultValue="medium"
        required 
      />
      <NumberInput source="behavior_score" min={1} max={5} defaultValue={3} />
      <SelectInput 
        source="hiset_status" 
        choices={[
          { id: 'not_started', name: 'Not Started' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'completed', name: 'Completed' }
        ]} 
        defaultValue="not_started"
      />
      <TextInput source="birth_date" type="date" />
      <TextInput source="emergency_contact" />
      <TextInput source="medical_notes" multiline />
      <TextInput source="academic_goals" multiline />
      <TextInput source="behavioral_notes" multiline />
    </SimpleForm>
  </Create>
);

export const CadetShow = (props) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="name" />
      <NumberField source="age" />
      <FunctionField 
        source="risk_level" 
        render={record => <RiskLevelField />}
        label="Risk Level"
      />
      <NumberField source="behavior_score" label="Behavior Score" />
      <ChipField source="status" />
      <TextField source="hiset_status" label="HiSET Status" />
      <TextField source="placement_status" label="Placement" />
      <DateField source="enrollment_date" />
      <DateField source="birth_date" />
      <TextField source="emergency_contact" />
      <TextField source="medical_notes" />
      <TextField source="academic_goals" />
      <TextField source="behavioral_notes" />
    </SimpleShowLayout>
  </Show>
);
