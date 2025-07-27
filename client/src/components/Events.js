
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  DateTimeInput,
  NumberInput,
  SelectInput,
  Filter,
  SearchInput
} from 'react-admin';

const EventFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search events" source="q" alwaysOn />
    <SelectInput 
      source="event_type" 
      choices={[
        { id: 'drill', name: 'Drill' },
        { id: 'class', name: 'Class' },
        { id: 'community_service', name: 'Community Service' },
        { id: 'counseling', name: 'Counseling' },
        { id: 'ceremony', name: 'Ceremony' }
      ]} 
    />
  </Filter>
);

export const EventList = (props) => (
  <List {...props} filters={<EventFilter />}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="event_type" label="Type" />
      <DateField source="start_date" showTime />
      <DateField source="end_date" showTime />
      <TextField source="location" />
      <NumberField source="required_staff" label="Staff Needed" />
      <NumberField source="community_service_hours" label="Service Hours" />
    </Datagrid>
  </List>
);

export const EventEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="title" required />
      <TextInput source="description" multiline />
      <SelectInput 
        source="event_type" 
        choices={[
          { id: 'drill', name: 'Drill' },
          { id: 'class', name: 'Class' },
          { id: 'community_service', name: 'Community Service' },
          { id: 'counseling', name: 'Counseling' },
          { id: 'ceremony', name: 'Ceremony' }
        ]} 
        required 
      />
      <DateTimeInput source="start_date" required />
      <DateTimeInput source="end_date" required />
      <TextInput source="location" />
      <NumberInput source="required_staff" required />
      <NumberInput source="community_service_hours" />
    </SimpleForm>
  </Edit>
);

export const EventCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="title" required />
      <TextInput source="description" multiline />
      <SelectInput 
        source="event_type" 
        choices={[
          { id: 'drill', name: 'Drill' },
          { id: 'class', name: 'Class' },
          { id: 'community_service', name: 'Community Service' },
          { id: 'counseling', name: 'Counseling' },
          { id: 'ceremony', name: 'Ceremony' }
        ]} 
        required 
      />
      <DateTimeInput source="start_date" required />
      <DateTimeInput source="end_date" required />
      <TextInput source="location" />
      <NumberInput source="required_staff" defaultValue={1} required />
      <NumberInput source="community_service_hours" defaultValue={0} />
    </SimpleForm>
  </Create>
);
