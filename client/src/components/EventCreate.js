
import React from 'react';
import {
  Create,
  SimpleForm,
  TextInput,
  DateTimeInput,
  NumberInput,
  SelectInput,
  required
} from 'react-admin';

export const EventCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="title" validate={[required()]} />
      <SelectInput 
        source="type" 
        choices={[
          { id: 'ceremony', name: 'Ceremony' },
          { id: 'training', name: 'Training' },
          { id: 'field_trip', name: 'Field Trip' },
          { id: 'community_service', name: 'Community Service' },
          { id: 'assessment', name: 'Assessment' }
        ]}
        validate={[required()]}
      />
      <DateTimeInput source="start_date" validate={[required()]} />
      <DateTimeInput source="end_date" validate={[required()]} />
      <TextInput source="location" validate={[required()]} />
      <NumberInput source="capacity" min={1} />
      <SelectInput 
        source="status" 
        choices={[
          { id: 'planned', name: 'Planned' },
          { id: 'active', name: 'Active' },
          { id: 'completed', name: 'Completed' },
          { id: 'cancelled', name: 'Cancelled' }
        ]}
        defaultValue="planned"
        validate={[required()]}
      />
      <TextInput source="description" multiline rows={4} />
      <TextInput source="requirements" multiline rows={3} />
    </SimpleForm>
  </Create>
);
