-- YCA CRM Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cadets table
CREATE TABLE IF NOT EXISTS cadets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    platoon VARCHAR(50),
    rank VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    enrollment_date DATE DEFAULT CURRENT_DATE,
    graduation_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    certifications TEXT[],
    availability JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff schedules table
CREATE TABLE IF NOT EXISTS staff_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    required_staff INTEGER DEFAULT 1,
    assigned_staff UUID[],
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioral tracking table
CREATE TABLE IF NOT EXISTS behavioral_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID REFERENCES cadets(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    staff_involved VARCHAR(255),
    follow_up_required BOOLEAN DEFAULT false,
    resolution_status VARCHAR(50) DEFAULT 'open',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic tracking table
CREATE TABLE IF NOT EXISTS academic_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID REFERENCES cadets(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    assessment_type VARCHAR(100) NOT NULL,
    grade NUMERIC(5,2),
    assessment_date DATE NOT NULL,
    instructor VARCHAR(255),
    notes TEXT,
    improvement_needed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES staff(id),
    recipient_type VARCHAR(20) NOT NULL, -- 'cadet', 'staff', 'family', 'all'
    recipient_ids UUID[],
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    communication_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'announcement'
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'draft',
    sent_at TIMESTAMP WITH TIME ZONE,
    read_by JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduling tables
CREATE TABLE IF NOT EXISTS scheduling_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    required_staff INTEGER NOT NULL DEFAULT 1,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    category VARCHAR(50) NOT NULL, -- 'hiset', 'physical', 'supervision', 'community', 'counseling', 'admin'
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES scheduling_tasks(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    confirmed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, staff_id)
);

-- Staff availability tracking
CREATE TABLE IF NOT EXISTS staff_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduling notifications log
CREATE TABLE IF NOT EXISTS scheduling_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES scheduling_tasks(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'assignment', 'reminder', 'change', 'cancellation'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
    message_content TEXT
);

-- Document management table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES staff(id),
    associated_cadet_id UUID REFERENCES cadets(id),
    tags TEXT[],
    is_confidential BOOLEAN DEFAULT false,
    access_level VARCHAR(50) DEFAULT 'staff_only',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentorship relationships table
CREATE TABLE IF NOT EXISTS mentorship_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID REFERENCES cadets(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    program_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'terminated'
    goals JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentorship logs table
CREATE TABLE IF NOT EXISTS mentorship_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID REFERENCES cadets(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_type VARCHAR(100) NOT NULL, -- 'one-on-one', 'group', 'activity', 'check-in'
    notes TEXT,
    goals_set JSONB DEFAULT '[]',
    progress_rating INTEGER CHECK (progress_rating >= 1 AND progress_rating <= 10),
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
    sentiment_magnitude DECIMAL(3,2), -- 0.00 to 1.00
    sentiment_confidence DECIMAL(3,2), -- 0.00 to 1.00
    alert_resolved BOOLEAN DEFAULT false,
    action_taken TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('community_service', 'recruitment', 'drill', 'class', 'counseling', 'ceremony', 'training', 'other')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    required_staff INTEGER DEFAULT 1,
    community_service_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event staff assignments table
CREATE TABLE IF NOT EXISTS event_staff_assignments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'participant',
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, staff_id)
);

-- Event cadet assignments table
CREATE TABLE IF NOT EXISTS event_cadet_assignments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    cadet_id INTEGER REFERENCES cadets(id) ON DELETE CASCADE,
    attendance_status VARCHAR(20) DEFAULT 'assigned' CHECK (attendance_status IN ('assigned', 'present', 'absent', 'excused')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, cadet_id)
);

-- Event reminders log table
CREATE TABLE IF NOT EXISTS event_reminders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,
    sent_to TEXT NOT NULL, -- JSON array of email addresses
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    location VARCHAR(255),
    condition VARCHAR(50) DEFAULT 'good',
    purchase_date DATE,
    cost DECIMAL(10,2),
    supplier VARCHAR(255),
    maintenance_due DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_event ON event_staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_staff ON event_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_event_cadet_assignments_event ON event_cadet_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cadet_assignments_cadet ON event_cadet_assignments(cadet_id);
CREATE INDEX IF NOT EXISTS idx_cadets_status ON cadets(status);
CREATE INDEX IF NOT EXISTS idx_cadets_platoon ON cadets(platoon);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_behavioral_cadet_date ON behavioral_tracking(cadet_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_academic_cadet_date ON academic_tracking(cadet_id, assessment_date);
CREATE INDEX IF NOT EXISTS idx_mentorship_cadet ON mentorship_relationships(cadet_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_mentor ON mentorship_relationships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_status ON mentorship_relationships(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE cadets ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cadet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust based on your authentication needs)
-- For demonstration, allowing all authenticated users to access data
-- In production, implement more restrictive policies based on roles

-- Policies for cadets table
CREATE POLICY "Allow authenticated users to view cadets" ON cadets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage cadets" ON cadets
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for staff table
CREATE POLICY "Allow authenticated users to view staff" ON staff
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage staff" ON staff
    FOR ALL USING (auth.role() = 'authenticated');

-- Similar policies for other tables
CREATE POLICY "Allow authenticated access to staff_schedules" ON staff_schedules
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to behavioral_tracking" ON behavioral_tracking
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to academic_tracking" ON academic_tracking
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to communications" ON communications
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to documents" ON documents
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to mentorship_relationships" ON mentorship_relationships
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to mentorship_logs" ON mentorship_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to events" ON events
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to inventory" ON inventory
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to event_staff_assignments" ON event_staff_assignments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to event_cadet_assignments" ON event_cadet_assignments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to event_reminders" ON event_reminders
    FOR ALL USING (auth.role() = 'authenticated');

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables
CREATE TRIGGER update_cadets_updated_at BEFORE UPDATE ON cadets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavioral_tracking_updated_at BEFORE UPDATE ON behavioral_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_tracking_updated_at BEFORE UPDATE ON academic_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_relationships_updated_at BEFORE UPDATE ON mentorship_relationships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_logs_updated_at BEFORE UPDATE ON mentorship_logs 
    FOR EACH ROW EXECUTE FUNCTION update_mentorship_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_staff_assignments_updated_at BEFORE UPDATE ON event_staff_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_cadet_assignments_updated_at BEFORE UPDATE ON event_cadet_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_reminders_updated_at BEFORE UPDATE ON event_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();