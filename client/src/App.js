import React from 'react';
import { Admin, Resource, ListGuesser, EditGuesser, ShowGuesser } from 'react-admin';
import dataProvider from './dataProvider';
import { Dashboard } from './components/Dashboard';
import { Layout } from './Layout';
import { StaffList } from './components/StaffList';
import { StaffEdit } from './components/StaffEdit';
import { StaffCreate } from './components/StaffCreate';
import { MentorshipList } from './components/MentorshipList';
import { MentorshipCreate } from './components/MentorshipCreate';
import { EventList, EventEdit, EventCreate } from './components/Events';
import { Reports } from './components/Reports';
import { AssignmentList, AssignmentEdit, AssignmentCreate, AssignmentShow } from './components/Assignments';
import { Scheduling } from './components/Scheduling';
import { SchedulingAnalytics } from './components/SchedulingAnalytics';
import { AIAssistant } from './components/AIAssistant';
import { BehavioralTracking } from './components/BehavioralTracking';
import { AcademicTracking } from './components/AcademicTracking';
import { Communications } from './components/Communications';
import { DocumentManagement } from './components/DocumentManagement';
import { authProvider } from './authProvider';
import { InventoryList, InventoryEdit, InventoryCreate, InventoryKanban } from './components/Inventory';
import { CadetList, CadetEdit, CadetCreate, CadetShow, CadetDashboard } from './components/CadetsManagement';
import { InventoryForecasting } from './components/InventoryForecasting';
import { BehaviorPrediction } from './components/BehaviorPrediction';
import ParentPortal from './components/ParentPortal';
import BadgeSystem from './components/BadgeSystem';
import ComplianceDashboard from './components/ComplianceDashboard';

// Icons
import {
  PeopleAlt as PeopleIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
  Inventory as InventoryIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import GroupIcon from '@mui/icons-material/Group';



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
      list={InventoryKanban} 
      edit={InventoryEdit} 
      create={InventoryCreate} 
      icon={InventoryIcon}
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
            <Resource name="scheduling-analytics" list={SchedulingAnalytics} options={{ label: 'Schedule Analytics' }} />
        <Resource 
          name="communications" 
          list={Communications} 
          icon={ChatIcon}
          options={{ label: 'Family Communications' }} 
        />
        <Resource 
          name="documents" 
          list={DocumentManagement} 
          icon={FolderIcon}
          options={{ label: 'Document Management' }} 
        />
        <Resource 
          name="parent-portal" 
          list={ParentPortal} 
          icon={GroupIcon}
          options={{ label: 'Parent Portal' }} 
        />
        <Resource 
          name="badges" 
          list={BadgeSystem} 
          icon={AssignmentIcon}
          options={{ label: 'Badges & Milestones' }} 
        />
        <Resource 
          name="compliance" 
          list={ComplianceDashboard} 
          icon={AnalyticsIcon}
          options={{ label: 'DoD Compliance' }} 
        />
      </Admin>
);

export default App;