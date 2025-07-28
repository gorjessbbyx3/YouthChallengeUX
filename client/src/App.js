import React from 'react';
import { Admin, Resource, ListGuesser, EditGuesser, ShowGuesser } from 'react-admin';
import dataProvider from './dataProvider';
import { Dashboard } from './components/Dashboard';
import { Layout } from './Layout';
import { CadetList } from './components/CadetList';
import { CadetEdit } from './components/CadetEdit';
import { CadetCreate } from './components/CadetCreate';
import { CadetShow } from './components/CadetShow';
import { StaffList } from './components/StaffList';
import { StaffEdit } from './components/StaffEdit';
import { StaffCreate } from './components/StaffCreate';
import { MentorshipList } from './components/MentorshipList';
import { MentorshipCreate } from './components/MentorshipCreate';
import { InventoryList } from './components/InventoryList';
import { InventoryEdit } from './components/InventoryEdit';
import { InventoryCreate } from './components/InventoryCreate';
import { EventList, EventEdit, EventCreate } from './components/Events';
import { Reports } from './components/Reports';
import { AssignmentList, AssignmentEdit, AssignmentCreate, AssignmentShow } from './components/Assignments';
import { Scheduling } from './components/Scheduling';
import { authProvider } from './authProvider';

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
          <Resource
        name="scheduling"
        list={Scheduling}
        // edit={AssignmentEdit}
        // create={AssignmentCreate}
        // show={AssignmentShow}
        icon={AssignmentIcon}
        options={{ label: 'Scheduling' }}
    />
      </Admin>
);

export default App;