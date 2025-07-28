
import React from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  required
} from 'react-admin';

export const InventoryEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} />
      <SelectInput 
        source="category" 
        choices={[
          { id: 'uniforms', name: 'Uniforms' },
          { id: 'supplies', name: 'Supplies' },
          { id: 'equipment', name: 'Equipment' },
          { id: 'educational', name: 'Educational' }
        ]}
        validate={[required()]}
      />
      <NumberInput source="quantity" min={0} validate={[required()]} />
      <NumberInput source="threshold" min={0} validate={[required()]} />
      <TextInput source="location" />
      <TextInput source="supplier" />
      <NumberInput source="unit_cost" min={0} step={0.01} />
      <TextInput source="description" multiline rows={3} />
    </SimpleForm>
  </Edit>
);
