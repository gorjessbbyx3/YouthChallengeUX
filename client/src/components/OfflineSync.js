
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  CloudQueue as SyncIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const OfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending sync items
    loadPendingSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingSync = async () => {
    try {
      const data = await getOfflineData();
      setPendingSync(data);
    } catch (error) {
      console.error('Error loading pending sync data:', error);
    }
  };

  const syncPendingData = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      for (const item of pendingSync) {
        await syncSingleItem(item);
      }
      setPendingSync([]);
      alert('All data synchronized successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Some data failed to sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const syncSingleItem = async (item) => {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });

      if (response.ok) {
        await removeOfflineData(item.id);
        return true;
      }
      throw new Error(`Sync failed: ${response.statusText}`);
    } catch (error) {
      console.error('Failed to sync item:', error);
      throw error;
    }
  };

  const getOfflineData = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('YCA_CRM_Offline', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineData'], 'readonly');
        const store = transaction.objectStore('offlineData');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  };

  const removeOfflineData = (id) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('YCA_CRM_Offline', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineData'], 'readwrite');
        const store = transaction.objectStore('offlineData');
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Offline Synchronization
      </Typography>

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isOnline ? (
                <CheckIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <OfflineIcon color="error" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6">
                {isOnline ? 'Online' : 'Offline'}
              </Typography>
            </Box>
            <Chip
              label={isOnline ? 'Connected' : 'Disconnected'}
              color={isOnline ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Pending Sync Items */}
      {pendingSync.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Pending Synchronization ({pendingSync.length} items)
              </Typography>
              {isOnline && (
                <Button
                  variant="contained"
                  startIcon={<SyncIcon />}
                  onClick={syncPendingData}
                  disabled={syncing}
                >
                  Sync All
                </Button>
              )}
            </Box>

            {syncing && <LinearProgress sx={{ mb: 2 }} />}

            <List>
              {pendingSync.slice(0, 5).map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <SyncIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.description || `${item.method} ${item.url}`}
                    secondary={new Date(item.timestamp).toLocaleString()}
                  />
                </ListItem>
              ))}
              {pendingSync.length > 5 && (
                <ListItem>
                  <ListItemText
                    primary={`... and ${pendingSync.length - 5} more items`}
                    sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Offline Mode Instructions */}
      {!isOnline && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Offline Mode Active:</strong> You can continue working with limited functionality. 
            Your changes will be automatically synchronized when you reconnect to the internet.
          </Typography>
        </Alert>
      )}

      {/* No Pending Sync */}
      {pendingSync.length === 0 && isOnline && (
        <Alert severity="success">
          <Typography variant="body2">
            All data is synchronized. No pending changes to upload.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default OfflineSync;
