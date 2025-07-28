
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Badge,
  LinearProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Security as SecurityIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axios from 'axios';

export const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [complianceDialog, setComplianceDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'cadet_record',
    cadet_id: '',
    folder_id: '',
    access_level: 'staff_only',
    retention_period: 2555, // 7 years in days
    compliance_required: true,
    file: null
  });

  const documentTypes = [
    { value: 'cadet_record', label: 'Cadet Record', compliance: true, retention: 2555 },
    { value: 'behavioral_report', label: 'Behavioral Report', compliance: true, retention: 2555 },
    { value: 'academic_transcript', label: 'Academic Transcript', compliance: true, retention: 2555 },
    { value: 'medical_record', label: 'Medical Record', compliance: true, retention: 2555 },
    { value: 'legal_document', label: 'Legal Document', compliance: true, retention: 3650 },
    { value: 'parent_communication', label: 'Parent Communication', compliance: false, retention: 1095 },
    { value: 'staff_memo', label: 'Staff Memo', compliance: false, retention: 365 },
    { value: 'training_material', label: 'Training Material', compliance: false, retention: 1095 },
    { value: 'policy_document', label: 'Policy Document', compliance: true, retention: 3650 },
    { value: 'incident_report', label: 'Incident Report', compliance: true, retention: 2555 }
  ];

  const accessLevels = [
    { value: 'public', label: 'Public Access', description: 'Viewable by all staff and cadets' },
    { value: 'staff_only', label: 'Staff Only', description: 'Restricted to staff members' },
    { value: 'admin_only', label: 'Admin Only', description: 'Highly restricted access' },
    { value: 'medical_staff', label: 'Medical Staff', description: 'Medical personnel only' },
    { value: 'cadet_family', label: 'Cadet & Family', description: 'Cadet and their family' }
  ];

  useEffect(() => {
    fetchDocuments();
    fetchCadets();
    fetchStaff();
    fetchFolders();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchCadets = async () => {
    try {
      const response = await axios.get('/api/cadets');
      setCadets(response.data);
    } catch (error) {
      console.error('Error fetching cadets:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await axios.get('/api/documents/folders');
      setFolders(response.data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!newDocument.file) return;

    const formData = new FormData();
    Object.keys(newDocument).forEach(key => {
      if (key === 'file') {
        formData.append('file', newDocument.file);
      } else {
        formData.append(key, newDocument[key]);
      }
    });

    try {
      const response = await axios.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setUploadDialog(false);
      setUploadProgress(0);
      setNewDocument({
        name: '',
        type: 'cadet_record',
        cadet_id: '',
        folder_id: '',
        access_level: 'staff_only',
        retention_period: 2555,
        compliance_required: true,
        file: null
      });
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const getDocumentIcon = (type) => {
    const iconMap = {
      cadet_record: <AssignmentIcon color="primary" />,
      behavioral_report: <WarningIcon color="warning" />,
      academic_transcript: <DocumentIcon color="success" />,
      medical_record: <SecurityIcon color="error" />,
      legal_document: <SecurityIcon color="secondary" />,
      default: <DocumentIcon />
    };
    return iconMap[type] || iconMap.default;
  };

  const getComplianceStatus = (doc) => {
    if (!doc.compliance_required) return { status: 'N/A', color: 'default' };
    
    const uploadDate = new Date(doc.created_at);
    const retentionDate = new Date(uploadDate.getTime() + (doc.retention_period * 24 * 60 * 60 * 1000));
    const now = new Date();
    
    if (retentionDate < now) return { status: 'Expired', color: 'error' };
    
    const daysUntilExpiry = Math.ceil((retentionDate - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) return { status: 'Expiring Soon', color: 'warning' };
    
    return { status: 'Compliant', color: 'success' };
  };

  const handleDocumentTypeChange = (type) => {
    const docType = documentTypes.find(dt => dt.value === type);
    setNewDocument(prev => ({
      ...prev,
      type,
      retention_period: docType?.retention || 2555,
      compliance_required: docType?.compliance || false
    }));
  };

  const filteredDocuments = selectedFolder === 'all' 
    ? documents 
    : documents.filter(doc => doc.folder_id === selectedFolder);

  const getStorageUsage = () => {
    const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    return {
      used: (totalSize / (1024 * 1024)).toFixed(2), // MB
      limit: 1000, // 1GB limit
      percentage: (totalSize / (1024 * 1024 * 1024)) * 100
    };
  };

  const storage = getStorageUsage();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <FolderIcon sx={{ mr: 2 }} />
          Document Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SecurityIcon />}
            onClick={() => setComplianceDialog(true)}
          >
            Compliance Report
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialog(true)}
          >
            Upload Document
          </Button>
        </Box>
      </Box>

      {/* Storage Usage */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Storage Usage</Typography>
            <Typography variant="body2" color="text.secondary">
              {storage.used} MB / {storage.limit} MB
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(storage.percentage, 100)} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Alert 
            severity={storage.percentage > 80 ? 'warning' : 'info'} 
            sx={{ mt: 2 }}
          >
            {storage.percentage > 80 
              ? 'Storage space is running low. Consider archiving old documents.'
              : 'Storage usage is within normal limits.'
            }
          </Alert>
        </CardContent>
      </Card>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="All Documents" icon={<DocumentIcon />} />
        <Tab label="By Category" icon={<FolderIcon />} />
        <Tab label="Compliance Tracking" icon={<SecurityIcon />} />
        <Tab label="Recent Activity" icon={<ScheduleIcon />} />
      </Tabs>

      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Document Library</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Folder</InputLabel>
                <Select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                >
                  <MenuItem value="all">All Documents</MenuItem>
                  {folders.map(folder => (
                    <MenuItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Document</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Cadet</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell>Access Level</TableCell>
                    <TableCell>Compliance</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDocuments
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((doc) => {
                      const compliance = getComplianceStatus(doc);
                      const cadet = cadets.find(c => c.id === doc.cadet_id);
                      
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getDocumentIcon(doc.type)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {doc.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={documentTypes.find(dt => dt.value === doc.type)?.label || doc.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {cadet ? `${cadet.first_name} ${cadet.last_name}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={accessLevels.find(al => al.value === doc.access_level)?.label || doc.access_level}
                              size="small"
                              color={doc.access_level === 'admin_only' ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={compliance.status}
                              size="small"
                              color={compliance.color}
                            />
                          </TableCell>
                          <TableCell>
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View">
                                <IconButton size="small">
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton size="small">
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Share">
                                <IconButton size="small">
                                  <ShareIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {documentTypes.map((docType) => {
            const typeDocuments = documents.filter(doc => doc.type === docType.value);
            return (
              <Grid item xs={12} md={6} lg={4} key={docType.value}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getDocumentIcon(docType.value)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {docType.label}
                      </Typography>
                      <Badge 
                        badgeContent={typeDocuments.length} 
                        color="primary" 
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Retention: {Math.floor(docType.retention / 365)} years
                      {docType.compliance && ' • Compliance Required'}
                    </Typography>

                    <List dense>
                      {typeDocuments.slice(0, 3).map((doc) => (
                        <ListItem key={doc.id} disablePadding>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <DocumentIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={doc.name}
                            secondary={new Date(doc.created_at).toLocaleDateString()}
                          />
                        </ListItem>
                      ))}
                      {typeDocuments.length > 3 && (
                        <ListItem>
                          <ListItemText 
                            primary={`+${typeDocuments.length - 3} more documents`}
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <CheckIcon color="success" sx={{ mr: 1 }} />
                  Compliant Documents
                </Typography>
                <Typography variant="h3" color="success.main" sx={{ mb: 1 }}>
                  {documents.filter(doc => getComplianceStatus(doc).status === 'Compliant').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents in good standing
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  Expiring Soon
                </Typography>
                <Typography variant="h3" color="warning.main" sx={{ mb: 1 }}>
                  {documents.filter(doc => getComplianceStatus(doc).status === 'Expiring Soon').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents expiring within 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Compliance Details
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  DoD Regulation Integration: All documents are automatically tracked for 
                  compliance with military youth program requirements.
                </Alert>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Document</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Retention Period</TableCell>
                        <TableCell>Days Until Expiry</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Action Required</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documents
                        .filter(doc => doc.compliance_required)
                        .map((doc) => {
                          const compliance = getComplianceStatus(doc);
                          const uploadDate = new Date(doc.created_at);
                          const retentionDate = new Date(uploadDate.getTime() + (doc.retention_period * 24 * 60 * 60 * 1000));
                          const daysUntilExpiry = Math.ceil((retentionDate - new Date()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <TableRow key={doc.id}>
                              <TableCell>{doc.name}</TableCell>
                              <TableCell>
                                {documentTypes.find(dt => dt.value === doc.type)?.label}
                              </TableCell>
                              <TableCell>
                                {Math.floor(doc.retention_period / 365)} years
                              </TableCell>
                              <TableCell>
                                {daysUntilExpiry > 0 ? daysUntilExpiry : 'Expired'}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={compliance.status}
                                  size="small"
                                  color={compliance.color}
                                />
                              </TableCell>
                              <TableCell>
                                {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                                  <Button size="small" variant="outlined" color="warning">
                                    Renew/Update
                                  </Button>
                                )}
                                {daysUntilExpiry <= 0 && (
                                  <Button size="small" variant="outlined" color="error">
                                    Archive/Dispose
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <form onSubmit={handleFileUpload}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Document Name"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={newDocument.type}
                    onChange={(e) => handleDocumentTypeChange(e.target.value)}
                    required
                  >
                    {documentTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                        {type.compliance && <SecurityIcon fontSize="small" sx={{ ml: 1 }} />}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Associated Cadet</InputLabel>
                  <Select
                    value={newDocument.cadet_id}
                    onChange={(e) => setNewDocument({...newDocument, cadet_id: e.target.value})}
                  >
                    <MenuItem value="">None</MenuItem>
                    {cadets.map((cadet) => (
                      <MenuItem key={cadet.id} value={cadet.id}>
                        {cadet.first_name} {cadet.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Access Level</InputLabel>
                  <Select
                    value={newDocument.access_level}
                    onChange={(e) => setNewDocument({...newDocument, access_level: e.target.value})}
                    required
                  >
                    {accessLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Retention Period (days)"
                  value={newDocument.retention_period}
                  onChange={(e) => setNewDocument({...newDocument, retention_period: parseInt(e.target.value)})}
                  helperText="Automatically set based on document type"
                />
              </Grid>

              <Grid item xs={12}>
                <input
                  type="file"
                  onChange={(e) => setNewDocument({...newDocument, file: e.target.files[0]})}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </Grid>

              {uploadProgress > 0 && (
                <Grid item xs={12}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Uploading... {uploadProgress}%
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  startIcon={<UploadIcon />}
                  disabled={uploadProgress > 0}
                >
                  Upload Document
                </Button>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
