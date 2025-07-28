
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { supabase } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG, and TXT files are allowed'));
    }
  }
});

// Get all documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        cadets:cadet_id (first_name, last_name),
        staff:uploaded_by (first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get documents for specific cadet
router.get('/cadet/:cadetId', authenticateToken, async (req, res) => {
  try {
    const { cadetId } = req.params;
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('cadet_id', cadetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload new document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      name,
      type,
      cadet_id,
      folder_id,
      access_level,
      retention_period,
      compliance_required
    } = req.body;

    // Calculate retention expiry date
    const retentionDays = parseInt(retention_period);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);

    const documentData = {
      name,
      type,
      file_path: req.file.path,
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      cadet_id: cadet_id || null,
      folder_id: folder_id || null,
      access_level,
      retention_period: retentionDays,
      retention_expiry: expiryDate.toISOString(),
      compliance_required: compliance_required === 'true',
      uploaded_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select();

    if (error) throw error;

    // Log document activity
    await logDocumentActivity(data[0].id, 'upload', req.user.id);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: data[0]
    });
  } catch (error) {
    // Clean up uploaded file if database insertion fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Get document folders
router.get('/folders', authenticateToken, async (req, res) => {
  try {
    const { data: folders, error } = await supabase
      .from('document_folders')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create document folder
router.post('/folders', authenticateToken, async (req, res) => {
  try {
    const { name, description, parent_id } = req.body;
    
    const { data, error } = await supabase
      .from('document_folders')
      .insert([{
        name,
        description,
        parent_id: parent_id || null,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download document
router.get('/download/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (!checkDocumentAccess(document, req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = document.file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Log download activity
    await logDocumentActivity(documentId, 'download', req.user.id);

    // Set proper headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    
    res.download(filePath, document.original_name, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get compliance report
router.get('/compliance/report', authenticateToken, async (req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('compliance_required', true);

    if (error) throw error;

    const now = new Date();
    const complianceReport = {
      total_compliance_documents: documents.length,
      compliant: 0,
      expiring_soon: 0,
      expired: 0,
      details: []
    };

    documents.forEach(doc => {
      const expiryDate = new Date(doc.retention_expiry);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      let status = 'compliant';
      if (daysUntilExpiry <= 0) {
        status = 'expired';
        complianceReport.expired++;
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
        complianceReport.expiring_soon++;
      } else {
        complianceReport.compliant++;
      }

      complianceReport.details.push({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        expiry_date: doc.retention_expiry,
        days_until_expiry: daysUntilExpiry,
        status
      });
    });

    res.json(complianceReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archive expired documents
router.post('/compliance/archive-expired', authenticateToken, async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    const { data: expiredDocs, error: selectError } = await supabase
      .from('documents')
      .select('*')
      .lt('retention_expiry', now)
      .eq('compliance_required', true);

    if (selectError) throw selectError;

    if (expiredDocs.length === 0) {
      return res.json({ message: 'No expired documents to archive', count: 0 });
    }

    // Move to archive table (you would need to create this)
    const archivePromises = expiredDocs.map(async (doc) => {
      // First insert into archive
      const { error: archiveError } = await supabase
        .from('document_archive')
        .insert([{
          ...doc,
          archived_at: new Date().toISOString(),
          archived_by: req.user.id
        }]);

      if (archiveError) throw archiveError;

      // Then delete from main documents table
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (deleteError) throw deleteError;

      // Delete physical file
      if (fs.existsSync(doc.file_path)) {
        fs.unlinkSync(doc.file_path);
      }

      return doc.id;
    });

    const archivedIds = await Promise.all(archivePromises);

    res.json({
      message: `Successfully archived ${archivedIds.length} expired documents`,
      count: archivedIds.length,
      archived_ids: archivedIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document activity logs
router.get('/activity/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const { data: activities, error } = await supabase
      .from('document_activity')
      .select(`
        *,
        staff:user_id (first_name, last_name)
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get document info first
    const { data: document, error: selectError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (selectError) throw selectError;
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && document.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    // Delete physical file
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Log deletion activity
    await logDocumentActivity(documentId, 'delete', req.user.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function checkDocumentAccess(document, user) {
  const accessLevel = document.access_level;
  const userRole = user.role;

  switch (accessLevel) {
    case 'public':
      return true;
    case 'staff_only':
      return ['staff', 'admin', 'instructor'].includes(userRole);
    case 'admin_only':
      return userRole === 'admin';
    case 'medical_staff':
      return ['medical', 'admin'].includes(userRole);
    case 'cadet_family':
      // Additional logic needed to check if user is associated with the cadet
      return ['admin', 'staff'].includes(userRole);
    default:
      return false;
  }
}

async function logDocumentActivity(documentId, action, userId) {
  try {
    await supabase
      .from('document_activity')
      .insert([{
        document_id: documentId,
        action,
        user_id: userId,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Error logging document activity:', error);
  }
}

module.exports = router;
