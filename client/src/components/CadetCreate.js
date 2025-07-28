
import React from 'react';
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  DateInput,
  SelectInput,
  required
} from 'react-admin';

export const CadetCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="first_name" validate={[required()]} />
      <TextInput source="last_name" validate={[required()]} />
      <DateInput source="date_of_birth" validate={[required()]} />
      <TextInput source="phone" />
      <TextInput source="email" />
      <TextInput source="address" multiline />
      <TextInput source="emergency_contact" />
      <TextInput source="emergency_phone" />
      <SelectInput 
        source="status" 
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'graduated', name: 'Graduated' },
          { id: 'dropped', name: 'Dropped' }
        ]}
        defaultValue="active"
        validate={[required()]}
      />
      <SelectInput 
        source="risk_level" 
        choices={[
          { id: 'low', name: 'Low Risk' },
          { id: 'medium', name: 'Medium Risk' },
          { id: 'high', name: 'High Risk' }
        ]}
        defaultValue="low"
        validate={[required()]}
      />
      <NumberInput source="behavior_score" min={1} max={5} defaultValue={3} />
      <NumberInput source="academic_score" min={1} max={5} defaultValue={3} />
      <SelectInput 
        source="placement_status" 
        choices={[
          { id: 'seeking', name: 'Seeking' },
          { id: 'workforce', name: 'Workforce' },
          { id: 'education', name: 'Education' },
          { id: 'military', name: 'Military' }
        ]}
        defaultValue="seeking"
      />
      <TextInput source="notes" multiline rows={3} />
    </SimpleForm>
  </Create>
);
