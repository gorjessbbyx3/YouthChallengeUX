
-- YCA CRM Supabase Database Schema

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'instructor', 'counselor', 'staff', 'medical')),
    department VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    availability JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cadets table
CREATE TABLE IF NOT EXISTS cadets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    admission_date DATE,
    graduation_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'withdrawn', 'suspended')),
    platoon VARCHAR(50),
    company VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document folders table
CREATE TABLE IF NOT EXISTS document_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES document_folders(id),
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    cadet_id UUID REFERENCES cadets(id),
    folder_id UUID REFERENCES document_folders(id),
    access_level VARCHAR(50) NOT NULL DEFAULT 'staff_only' 
        CHECK (access_level IN ('public', 'staff_only', 'admin_only', 'medical_staff', 'cadet_family')),
    retention_period INTEGER NOT NULL DEFAULT 2555, -- days
    retention_expiry TIMESTAMP WITH TIME ZONE,
    compliance_required BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document activity log table
CREATE TABLE IF NOT EXISTS document_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('upload', 'download', 'view', 'edit', 'delete', 'share')),
    user_id UUID REFERENCES staff(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document archive table
CREATE TABLE IF NOT EXISTS document_archive (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_document_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    file_path TEXT,
    cadet_id UUID,
    access_level VARCHAR(50),
    retention_period INTEGER,
    compliance_required BOOLEAN,
    uploaded_by UUID,
    original_created_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_by UUID REFERENCES staff(id),
    archive_reason TEXT
);

-- Scheduling tables
CREATE TABLE IF NOT EXISTS schedule_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    required_staff INTEGER DEFAULT 1,
    task_type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES schedule_tasks(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    role VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES staff(id),
    UNIQUE(task_id, staff_id)
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'phone', 'letter', 'meeting')),
    subject VARCHAR(500),
    message TEXT NOT NULL,
    cadet_id UUID REFERENCES cadets(id),
    staff_id UUID REFERENCES staff(id),
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('parent', 'guardian', 'emergency_contact', 'cadet')),
    recipient_name VARCHAR(200),
    recipient_contact VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_confirmation BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioral tracking table
CREATE TABLE IF NOT EXISTS behavioral_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadet_id UUID REFERENCES cadets(id) NOT NULL,
    date DATE NOT NULL,
    behavior_type VARCHAR(100) NOT NULL,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    description TEXT,
    context TEXT,
    location VARCHAR(255),
    staff_witness UUID REFERENCES staff(id),
    intervention_taken TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    parent_notified BOOLEAN DEFAULT false,
    incident_number VARCHAR(50) UNIQUE,
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic tracking table
CREATE TABLE IF NOT EXISTS academic_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadet_id UUID REFERENCES cadets(id) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    assignment_name VARCHAR(255),
    assignment_type VARCHAR(100),
    date_assigned DATE,
    date_due DATE,
    date_submitted DATE,
    grade DECIMAL(5,2),
    max_points DECIMAL(5,2),
    percentage DECIMAL(5,2),
    letter_grade VARCHAR(5),
    instructor_id UUID REFERENCES staff(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_cadet_id ON documents(cadet_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_document_activity_document_id ON document_activity(document_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_start_time ON schedule_tasks(start_time);
CREATE INDEX IF NOT EXISTS idx_communications_cadet_id ON communications(cadet_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_tracking_cadet_id ON behavioral_tracking(cadet_id);
CREATE INDEX IF NOT EXISTS idx_academic_tracking_cadet_id ON academic_tracking(cadet_id);

-- Insert default document folders
INSERT INTO document_folders (name, description) VALUES
    ('Cadet Records', 'Primary cadet documentation and records'),
    ('Medical Records', 'Health and medical documentation'),
    ('Academic Records', 'Educational transcripts and assessments'),
    ('Behavioral Reports', 'Incident reports and behavioral documentation'),
    ('Legal Documents', 'Legal papers and court-ordered documentation'),
    ('Family Communications', 'Letters and communications with families'),
    ('Staff Documents', 'Internal staff memos and training materials'),
    ('Policies & Procedures', 'Official program policies and procedures')
ON CONFLICT DO NOTHING;

-- Insert sample staff (optional - for testing)
INSERT INTO staff (first_name, last_name, email, role, department) VALUES
    ('Admin', 'User', 'admin@yca.hawaii.gov', 'admin', 'Administration'),
    ('Sarah', 'Johnson', 'sarah.johnson@yca.hawaii.gov', 'instructor', 'Academic'),
    ('Mike', 'Chen', 'mike.chen@yca.hawaii.gov', 'counselor', 'Behavioral Health'),
    ('Lisa', 'Rodriguez', 'lisa.rodriguez@yca.hawaii.gov', 'medical', 'Medical')
ON CONFLICT (email) DO NOTHING;
