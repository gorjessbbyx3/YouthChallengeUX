
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  Filter,
  SearchInput
} from 'react-admin';

const StaffFilter = (props) => (
  <Filter {...props}>
    <SearchInput placeholder="Search by name" source="q" alwaysOn />
    <SelectInput 
      source="role" 
      choices={[
        { id: 'instructor', name: 'Instructor' },
        { id: 'counselor', name: 'Counselor' },
        { id: 'administrator', name: 'Administrator' },
        { id: 'mentor', name: 'Mentor' }
      ]} 
    />
  </Filter>
);

export const StaffList = (props) => (
  <List {...props} filters={<StaffFilter />}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <TextField source="role" />
      <TextField source="email" />
      <TextField source="phone" />
      <TextField source="experience_level" label="Experience" />
    </Datagrid>
  </List>
);

export const StaffEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" required />
      <SelectInput 
        source="role" 
        choices={[
          { id: 'instructor', name: 'Instructor' },
          { id: 'counselor', name: 'Counselor' },
          { id: 'administrator', name: 'Administrator' },
          { id: 'mentor', name: 'Mentor' }
        ]} 
        required 
      />
      <TextInput source="email" type="email" required />
      <TextInput source="phone" />
      <SelectInput 
        source="experience_level" 
        choices={[
          { id: 'entry', name: 'Entry Level' },
          { id: 'experienced', name: 'Experienced' },
          { id: 'senior', name: 'Senior' }
        ]} 
        required 
      />
    </SimpleForm>
  </Edit>
);

export const StaffCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" required />
      <SelectInput 
        source="role" 
        choices={[
          { id: 'instructor', name: 'Instructor' },
          { id: 'counselor', name: 'Counselor' },
          { id: 'administrator', name: 'Administrator' },
          { id: 'mentor', name: 'Mentor' }
        ]} 
        required 
      />
      <TextInput source="email" type="email" required />
      <TextInput source="phone" />
      <SelectInput 
        source="experience_level" 
        choices={[
          { id: 'entry', name: 'Entry Level' },
          { id: 'experienced', name: 'Experienced' },
          { id: 'senior', name: 'Senior' }
        ]} 
        defaultValue="experienced"
        required 
      />
    </SimpleForm>
  </Create>
);
