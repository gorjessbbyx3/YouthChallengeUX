import React from 'react';
import { Admin, Resource, ListGuesser, EditGuesser, ShowGuesser } from 'react-admin';
import jsonServerProvider from 'ra-data-json-server';
import { Dashboard } from './components/Dashboard';
import { CadetList, CadetEdit, CadetCreate, CadetShow } from './components/Cadets';
import { StaffList, StaffEdit, StaffCreate } from './components/Staff';
import { MentorshipList, MentorshipCreate } from './components/Mentorship';
import { InventoryList, InventoryEdit, InventoryCreate } from './components/Inventory';
import { EventList, EventEdit, EventCreate } from './components/Events';
import { AssignmentList, AssignmentEdit, AssignmentCreate, AssignmentShow } from './components/Assignments';
import { Reports } from './components/Reports';
import { AIAssistant } from './components/AIAssistant';
import { authProvider } from './authProvider';
import { Layout } from './Layout';

// Icons
import {
  PeopleAlt as PeopleIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Inventory as InventoryIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

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
        <Resource name="ai-assistant" list={AIAssistant} />
            <Resource
        name="assignments"
        list={AssignmentList}
        edit={AssignmentEdit}
        create={AssignmentCreate}
        show={AssignmentShow}
        icon={AssignmentIcon}
        options={{ label: 'Assignments' }}
    />
    <Resource
        name="reports"
        list={Reports}
        icon={AnalyticsIcon}
        options={{ label: 'Reports' }}
    />
      </Admin>
);

export default App;