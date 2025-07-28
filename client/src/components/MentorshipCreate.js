
import React from 'react';
import {
  Create,
  SimpleForm,
  ReferenceInput,
  SelectInput,
  TextInput,
  DateInput,
  required
} from 'react-admin';

export const MentorshipCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <ReferenceInput source="cadet_id" reference="cadets" validate={[required()]}>
        <SelectInput optionText="first_name" />
      </ReferenceInput>
      <ReferenceInput source="mentor_id" reference="staff" validate={[required()]}>
        <SelectInput optionText="first_name" />
      </ReferenceInput>
      <SelectInput 
        source="status" 
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'completed', name: 'Completed' },
          { id: 'paused', name: 'Paused' }
        ]}
        defaultValue="active"
        validate={[required()]}
      />
      <DateInput source="start_date" validate={[required()]} />
      <DateInput source="end_date" />
      <TextInput source="goals" multiline rows={3} />
      <TextInput source="notes" multiline rows={3} />
    </SimpleForm>
  </Create>
);
