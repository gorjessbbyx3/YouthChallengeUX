
import React from 'react';
import { Admin, Resource, ListGuesser, EditGuesser, ShowGuesser } from 'react-admin';
import jsonServerProvider from 'ra-data-json-server';
import { Dashboard } from './components/Dashboard';
import { CadetList, CadetEdit, CadetCreate, CadetShow } from './components/Cadets';
import { StaffList, StaffEdit, StaffCreate } from './components/Staff';
import { MentorshipList, MentorshipCreate } from './components/Mentorship';
import { InventoryList, InventoryEdit, InventoryCreate } from './components/Inventory';
import { EventList, EventCreate, EventEdit } from './components/Events';
import { authProvider } from './authProvider';
import { Layout } from './Layout';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import InventoryIcon from '@mui/icons-material/Inventory';
import EventIcon from '@mui/icons-material/Event';

const dataProvider = jsonServerProvider('/api');

const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    dashboard={Dashboard}
    layout={Layout}
    title="YCA CRM - Hawaii National Guard Youth Challenge Academy"
  >
    <Resource 
      name="cadets" 
      list={CadetList} 
      edit={CadetEdit} 
      create={CadetCreate} 
      show={CadetShow}
      icon={PeopleIcon}
      options={{ label: 'Cadets' }}
    />
    <Resource 
      name="staff" 
      list={StaffList} 
      edit={StaffEdit} 
      create={StaffCreate}
      icon={PersonIcon}
      options={{ label: 'Staff' }}
    />
    <Resource 
      name="mentorship" 
      list={MentorshipList} 
      create={MentorshipCreate}
      icon={ChatIcon}
      options={{ label: 'Mentorship' }}
    />
    <Resource 
      name="inventory" 
      list={InventoryList} 
      edit={InventoryEdit} 
      create={InventoryCreate}
      icon={InventoryIcon}
      options={{ label: 'Inventory' }}
    />
    <Resource 
      name="events" 
      list={EventList} 
      edit={EventEdit} 
      create={EventCreate}
      icon={EventIcon}
      options={{ label: 'Events' }}
    />
  </Admin>
);

export default App;
