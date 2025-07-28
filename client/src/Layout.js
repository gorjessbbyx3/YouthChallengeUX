import React from 'react';
import { Layout as RALayout, AppBar, UserMenu, Logout } from 'react-admin';
import { Typography } from '@mui/material';
import { 
  People, 
  Assignment, 
  Event, 
  Inventory, 
  Group, 
  Schedule,
  SmartToy,
  BarChart,
  Psychology,
  School
} from '@mui/icons-material';

const CustomAppBar = (props) => (
  <AppBar {...props}>
    <Typography variant="h6" color="inherit" sx={{ flex: 1 }}>
      YCA Kapolei CRM
    </Typography>
    <UserMenu>
      <Logout />
    </UserMenu>
  </AppBar>
);

export const Layout = (props) => <RALayout {...props} appBar={CustomAppBar} />;