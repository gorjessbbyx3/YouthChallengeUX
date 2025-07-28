
import React from 'react';
import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  ChipField,
  Tab,
  TabbedShowLayout
} from 'react-admin';
import { Box, Chip } from '@mui/material';

const RiskLevelField = ({ record }) => {
  const getColor = (level) => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip 
      label={record?.risk_level} 
      color={getColor(record?.risk_level)}
      size="small"
    />
  );
};

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'active': return 'primary';
      case 'graduated': return 'success';
      case 'dropped': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip 
      label={record?.status} 
      color={getColor(record?.status)}
      size="small"
    />
  );
};

export const CadetShow = (props) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label="Personal Info">
        <TextField source="first_name" />
        <TextField source="last_name" />
        <DateField source="date_of_birth" />
        <TextField source="phone" />
        <TextField source="email" />
        <TextField source="address" />
        <TextField source="emergency_contact" />
        <TextField source="emergency_phone" />
      </Tab>
      
      <Tab label="Status & Progress">
        <StatusField source="status" />
        <RiskLevelField source="risk_level" />
        <NumberField source="behavior_score" />
        <NumberField source="academic_score" />
        <ChipField source="placement_status" />
        <TextField source="notes" />
      </Tab>
      
      <Tab label="Timeline">
        <DateField source="enrollment_date" />
        <DateField source="graduation_date" />
        <DateField source="created_at" />
        <DateField source="updated_at" />
      </Tab>
    </TabbedShowLayout>
  </Show>
);
