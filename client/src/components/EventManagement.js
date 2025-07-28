
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Calendar as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'community_service',
    location: '',
    required_staff: 1,
    staff_ids: [],
    cadet_ids: []
  });

  const eventTypes = [
    { value: 'community_service', label: 'Community Service', color: '#4CAF50' },
    { value: 'recruitment', label: 'Recruitment Drive', color: '#2196F3' },
    { value: 'training', label: 'Training Exercise', color: '#FF9800' },
    { value: 'ceremony', label: 'Ceremony', color: '#9C27B0' },
    { value: 'academic', label: 'Academic Event', color: '#607D8B' },
    { value: 'physical_training', label: 'Physical Training', color: '#F44336' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsRes, staffRes, cadetsRes] = await Promise.all([
        fetch('/api/events', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}),
        fetch('/api/staff', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}),
        fetch('/api/cadets', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }})
      ]);

      const [eventsData, staffData, cadetsData] = await Promise.all([
        eventsRes.json(),
        staffRes.json(),
        cadetsRes.json()
      ]);

      setEvents(eventsData.map(event => ({
        ...event,
        start: new Date(`${event.date}T${event.time}`),
        end: new Date(`${event.date}T${event.time}`),
        title: event.title
      })));
      setStaff(staffData);
      setCadets(cadetsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      type: 'community_service',
      location: '',
      required_staff: 1,
      staff_ids: [],
      cadet_ids: []
    });
    setDialogOpen(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time,
      type: event.type,
      location: event.location || '',
      required_staff: event.required_staff,
      staff_ids: event.assigned_staff?.map(s => s.id) || [],
      cadet_ids: event.assigned_cadets?.map(c => c.id) || []
    });
    setDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    try {
      const url = selectedEvent ? `/api/events/${selectedEvent.id}` : '/api/events';
      const method = selectedEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save event');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to cancel this event? All participants will be notified.')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const getEventStyle = (event) => ({
    style: {
      backgroundColor: eventTypes.find(t => t.value === event.type)?.color || '#757575',
      border: 'none',
      color: 'white',
      fontSize: '12px'
    }
  });

  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return events
      .filter(event => event.start >= today && event.start <= nextWeek)
      .sort((a, b) => a.start - b.start);
  };

  const getEventStats = () => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => e.start > new Date()).length;
    const communityServiceEvents = events.filter(e => e.type === 'community_service').length;
    const totalStaffAssignments = events.reduce((sum, e) => sum + (e.assigned_staff?.length || 0), 0);

    return { totalEvents, upcomingEvents, communityServiceEvents, totalStaffAssignments };
  };

  const stats = getEventStats();
  const upcomingEvents = getUpcomingEvents();

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading events...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <CalendarIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Event Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateEvent}
        >
          Schedule Event
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Calendar View" />
        <Tab label="Event List" />
        <Tab label="Statistics" />
      </Tabs>

      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              eventPropGetter={getEventStyle}
              onSelectEvent={handleEditEvent}
              views={['month', 'week', 'day']}
              popup
            />
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>All Events</Typography>
                <List>
                  {events.map(event => (
                    <ListItem key={event.id}>
                      <ListItemIcon>
                        <EventIcon color={event.start > new Date() ? 'primary' : 'disabled'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {moment(event.start).format('MMM DD, YYYY [at] h:mm A')}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Type: {eventTypes.find(t => t.value === event.type)?.label}
                              {event.assigned_staff?.length > 0 && ` • Staff: ${event.assigned_staff.length}`}
                              {event.assigned_cadets?.length > 0 && ` • Cadets: ${event.assigned_cadets.length}`}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box>
                        <IconButton onClick={() => handleEditEvent(event)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteEvent(event.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upcoming Events</Typography>
                {upcomingEvents.length === 0 ? (
                  <Typography color="textSecondary">No upcoming events</Typography>
                ) : (
                  upcomingEvents.map(event => (
                    <Alert key={event.id} severity="info" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        <strong>{event.title}</strong><br />
                        {moment(event.start).fromNow()}
                      </Typography>
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EventIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{stats.totalEvents}</Typography>
                <Typography color="textSecondary">Total Events</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">{stats.upcomingEvents}</Typography>
                <Typography color="textSecondary">Upcoming</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{stats.communityServiceEvents}</Typography>
                <Typography color="textSecondary">Service Events</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">{stats.totalStaffAssignments}</Typography>
                <Typography color="textSecondary">Staff Assignments</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedEvent ? 'Edit Event' : 'Schedule New Event'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Event Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Required Staff"
                value={formData.required_staff}
                onChange={(e) => setFormData({ ...formData, required_staff: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained">
            {selectedEvent ? 'Update Event' : 'Schedule Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventManagement;
