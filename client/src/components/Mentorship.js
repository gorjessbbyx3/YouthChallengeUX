
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  Create,
  SimpleForm,
  TextInput,
  ReferenceInput,
  SelectInput,
  DateInput,
  NumberInput,
  Filter,
  ReferenceField
} from 'react-admin';

const MentorshipFilter = (props) => (
  <Filter {...props}>
    <ReferenceInput source="cadet_id" reference="cadets">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <ReferenceInput source="mentor_id" reference="staff">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <SelectInput 
      source="session_type" 
      choices={[
        { id: 'individual', name: 'Individual' },
        { id: 'group', name: 'Group' },
        { id: 'crisis', name: 'Crisis Intervention' },
        { id: 'goal_setting', name: 'Goal Setting' }
      ]} 
    />
  </Filter>
);

export const MentorshipList = (props) => (
  <List {...props} filters={<MentorshipFilter />}>
    <Datagrid>
      <DateField source="date" />
      <ReferenceField source="cadet_id" reference="cadets">
        <TextField source="name" />
      </ReferenceField>
      <ReferenceField source="mentor_id" reference="staff">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="session_type" label="Session Type" />
      <NumberField source="progress_rating" label="Progress (1-5)" />
      <TextField source="notes" />
    </Datagrid>
  </List>
);

export const MentorshipCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <ReferenceInput source="cadet_id" reference="cadets" required>
        <SelectInput optionText="name" />
      </ReferenceInput>
      <ReferenceInput source="mentor_id" reference="staff" required>
        <SelectInput optionText="name" />
      </ReferenceInput>
      <DateInput source="date" required defaultValue={new Date().toISOString().split('T')[0]} />
      <SelectInput 
        source="session_type" 
        choices={[
          { id: 'individual', name: 'Individual' },
          { id: 'group', name: 'Group' },
          { id: 'crisis', name: 'Crisis Intervention' },
          { id: 'goal_setting', name: 'Goal Setting' }
        ]} 
        defaultValue="individual"
        required 
      />
      <TextInput source="notes" multiline required />
      <TextInput source="goals_set" multiline />
      <NumberInput source="progress_rating" min={1} max={5} defaultValue={3} />
    </SimpleForm>
  </Create>
);
