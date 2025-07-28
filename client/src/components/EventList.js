import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  SelectField,
  NumberField,
  EditButton,
  DeleteButton,
  Create,
  SimpleForm,
  TextInput,
  DateTimeInput,
  SelectInput,
  NumberInput,
  Edit,
  ReferenceArrayInput,
  SelectArrayInput,
  useDataProvider,
  useNotify,
  TopToolbar,
  CreateButton
} from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Send as SendIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

const eventTypeChoices = [
  { id: 'community_service', name: 'Community Service' },
  { id: 'recruitment', name: 'Recruitment' },
  { id: 'drill', name: 'Drill' },
  { id: 'class', name: 'Class' },
  { id: 'counseling', name: 'Counseling' },
  { id: 'ceremony', name: 'Ceremony' },
  { id: 'training', name: 'Training' },
  { id: 'other', name: 'Other' }
];

const statusChoices = [
  { id: 'scheduled', name: 'Scheduled' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'completed', name: 'Completed' },
  { id: 'cancelled', name: 'Cancelled' }
];

const EventListActions = ({ basePath, data, resource }) => {
  const [reminderDialog, setReminderDialog] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const sendReminders = async () => {
    try {
      await dataProvider.create('events/send-reminders', { data: {} });
      notify('Reminders sent successfully', { type: 'success' });
      setReminderDialog(false);
    } catch (error) {
      notify('Error sending reminders', { type: 'error' });
    }
  };

  return (
    <TopToolbar>
      <CreateButton />
      <Button
        onClick={() => setReminderDialog(true)}
        startIcon={<SendIcon />}
        variant="outlined"
      >
        Send Reminders
      </Button>

      <Dialog open={reminderDialog} onClose={() => setReminderDialog(false)}>
        <DialogTitle>Send Event Reminders</DialogTitle>
        <DialogContent>
          <Typography>
            This will send reminder emails to all staff and cadets assigned to events scheduled for tomorrow.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialog(false)}>Cancel</Button>
          <Button onClick={sendReminders} variant="contained">Send Reminders</Button>
        </DialogActions>
      </Dialog>
    </TopToolbar>
  );
};

export const EventList = (props) => {
  const [viewMode, setViewMode] = useState('list');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const dataProvider = useDataProvider();

  useEffect(() => {
    if (viewMode === 'calendar') {
      loadCalendarEvents();
    }
  }, [viewMode, currentDate]);

  const loadCalendarEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await dataProvider.getList(`events/calendar/${year}/${month}`, {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'start_date', order: 'ASC' },
        filter: {}
      });
      setCalendarEvents(result.data);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  const EventTypeChip = ({ record }) => {
    const getColor = (type) => {
      switch (type) {
        case 'community_service': return 'success';
        case 'recruitment': return 'info';
        case 'drill': return 'warning';
        case 'class': return 'primary';
        case 'counseling': return 'secondary';
        case 'ceremony': return 'error';
        default: return 'default';
      }
    };

    return (
      <Chip 
        label={eventTypeChoices.find(c => c.id === record.event_type)?.name || record.event_type}
        color={getColor(record.event_type)}
        size="small"
      />
    );
  };

  const ServiceHoursField = ({ record }) => {
    if (!record.community_service_hours || record.community_service_hours === 0) {
      return <Typography variant="caption">-</Typography>;
    }
    return (
      <Chip 
        label={`${record.community_service_hours}h`}
        color="success"
        size="small"
        icon={<ScheduleIcon />}
      />
    );
  };

  const AssignedStaffField = ({ record }) => {
    const count = record.assigned_staff?.length || 0;
    return (
      <Tooltip title={record.assigned_staff?.map(s => s.name).join(', ') || 'No staff assigned'}>
        <Chip 
          label={`${count} staff`}
          color={count >= record.required_staff ? 'success' : 'warning'}
          size="small"
          icon={<PeopleIcon />}
        />
      </Tooltip>
    );
  };

  const CalendarView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const navigateMonth = (direction) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    };

    const getEventsForDay = (day) => {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      return calendarEvents.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === dayDate.toDateString();
      });
    };

    const renderCalendarDay = (day) => {
      const dayEvents = getEventsForDay(day);

      return (
        <Box
          key={day}
          sx={{
            minHeight: 120,
            border: '1px solid #e0e0e0',
            p: 1,
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="caption" fontWeight="bold">{day}</Typography>
          {dayEvents.map(event => (
            <Box key={event.id} sx={{ mt: 0.5 }}>
              <Chip
                label={event.title}
                size="small"
                color={event.event_type === 'community_service' ? 'success' : 'primary'}
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
          ))}
        </Box>
      );
    };

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Button onClick={() => navigateMonth(-1)}>Previous</Button>
            <Typography variant="h5">{monthName}</Typography>
            <Button onClick={() => navigateMonth(1)}>Next</Button>
          </Box>

          <Grid container spacing={0}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Grid item xs key={day} sx={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', border: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" fontWeight="bold">{day}</Typography>
              </Grid>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <Grid item xs key={`empty-${i}`} sx={{ minHeight: 120, border: '1px solid #e0e0e0', bgcolor: 'grey.50' }} />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => (
              <Grid item xs key={i + 1}>
                {renderCalendarDay(i + 1)}
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Event Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setViewMode('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ListIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('calendar')}
            color={viewMode === 'calendar' ? 'primary' : 'default'}
          >
            <CalendarIcon />
          </IconButton>
        </Box>
      </Box>

      {viewMode === 'calendar' ? (
        <CalendarView />
      ) : (
        <List {...props} actions={<EventListActions />}>
          <Datagrid rowClick="edit">
            <TextField source="title" />
            <EventTypeChip source="event_type" />
            <DateField source="start_date" showTime />
            <TextField source="location" />
            <AssignedStaffField source="assigned_staff" />
            <ServiceHoursField source="community_service_hours" />
            <SelectField source="status" choices={statusChoices} />
            <EditButton />
            <DeleteButton />
          </Datagrid>
        </List>
      )}
    </Box>
  );
};

export const EventCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextInput source="title" required fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <SelectInput 
            source="event_type" 
            choices={eventTypeChoices}
            required 
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextInput source="description" multiline rows={3} fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <DateTimeInput source="start_date" required fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <DateTimeInput source="end_date" required fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput source="location" fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <NumberInput source="required_staff" defaultValue={1} fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <NumberInput 
            source="community_service_hours" 
            step={0.5}
            fullWidth
            helperText="Hours for community service events"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SelectInput 
            source="status" 
            choices={statusChoices}
            defaultValue="scheduled"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ReferenceArrayInput source="assigned_staff" reference="staff">
            <SelectArrayInput optionText="name" fullWidth />
          </ReferenceArrayInput>
        </Grid>
        <Grid item xs={12} md={6}>
          <ReferenceArrayInput source="assigned_cadets" reference="cadets">
            <SelectArrayInput optionText="name" fullWidth />
          </ReferenceArrayInput>
        </Grid>
      </Grid>
    </SimpleForm>
  </Create>
);

export const EventEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextInput source="title" required fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <SelectInput 
            source="event_type" 
            choices={eventTypeChoices}
            required 
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextInput source="description" multiline rows={3} fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <DateTimeInput source="start_date" required fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <DateTimeInput source="end_date" required fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput source="location" fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <NumberInput source="required_staff" fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <NumberInput 
            source="community_service_hours" 
            step={0.5}
            fullWidth
            helperText="Hours for community service events"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SelectInput 
            source="status" 
            choices={statusChoices}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ReferenceArrayInput source="assigned_staff" reference="staff">
            <SelectArrayInput optionText="name" fullWidth />
          </ReferenceArrayInput>
        </Grid>
        <Grid item xs={12} md={6}>
          <ReferenceArrayInput source="assigned_cadets" reference="cadets">
            <SelectArrayInput optionText="name" fullWidth />
          </ReferenceArrayInput>
        </Grid>
      </Grid>
    </SimpleForm>
  </Edit>
);