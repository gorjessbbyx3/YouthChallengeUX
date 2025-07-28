
import React from 'react';
import {
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  required,
  email
} from 'react-admin';

export const StaffCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="first_name" validate={[required()]} />
      <TextInput source="last_name" validate={[required()]} />
      <TextInput source="email" validate={[required(), email()]} />
      <TextInput source="phone" />
      <SelectInput 
        source="role" 
        choices={[
          { id: 'director', name: 'Director' },
          { id: 'instructor', name: 'Instructor' },
          { id: 'counselor', name: 'Counselor' },
          { id: 'support', name: 'Support Staff' }
        ]}
        validate={[required()]}
      />
      <SelectInput 
        source="department" 
        choices={[
          { id: 'administration', name: 'Administration' },
          { id: 'academic', name: 'Academic' },
          { id: 'behavioral', name: 'Behavioral' },
          { id: 'support', name: 'Support' }
        ]}
        validate={[required()]}
      />
      <SelectInput 
        source="status" 
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'inactive', name: 'Inactive' },
          { id: 'leave', name: 'On Leave' }
        ]}
        defaultValue="active"
        validate={[required()]}
      />
      <DateInput source="hire_date" />
      <TextInput source="qualifications" multiline rows={3} />
    </SimpleForm>
  </Create>
);
