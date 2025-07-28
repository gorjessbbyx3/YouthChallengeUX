
-- Behavioral Tracking Table
CREATE TABLE IF NOT EXISTS behavioral_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cadet_id INTEGER NOT NULL,
    behavior_type VARCHAR(100) NOT NULL,
    severity INTEGER NOT NULL CHECK(severity >= 1 AND severity <= 10),
    context TEXT,
    intervention TEXT,
    notes TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cadet_id) REFERENCES cadets(id) ON DELETE CASCADE
);

-- Academic Tracking Table
CREATE TABLE IF NOT EXISTS academic_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cadet_id INTEGER NOT NULL,
    subject VARCHAR(100) NOT NULL,
    assignment_type VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 100,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cadet_id) REFERENCES cadets(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_behavioral_tracking_cadet_id ON behavioral_tracking(cadet_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_tracking_date ON behavioral_tracking(date);
CREATE INDEX IF NOT EXISTS idx_academic_tracking_cadet_id ON academic_tracking(cadet_id);
CREATE INDEX IF NOT EXISTS idx_academic_tracking_date ON academic_tracking(date);
CREATE INDEX IF NOT EXISTS idx_academic_tracking_subject ON academic_tracking(subject);
