
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'yca_crm.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Sentiment analysis logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS sentiment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cadet_id INTEGER,
      text_analyzed TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      urgency TEXT NOT NULL,
      analysis_date TEXT NOT NULL,
      FOREIGN KEY (cadet_id) REFERENCES cadets (id)
    )
  `);

  // Staff scheduling table
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      task_type TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff (id)
    )
  `);

  // Room assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS room_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cadet_id INTEGER NOT NULL,
      room_number INTEGER NOT NULL,
      bed_number INTEGER NOT NULL,
      assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cadet_id) REFERENCES cadets (id)
    )
  `);

  // Cadet milestones and rewards table
  db.run(`
    CREATE TABLE IF NOT EXISTS cadet_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cadet_id INTEGER NOT NULL,
      milestone_type TEXT NOT NULL,
      description TEXT,
      points INTEGER DEFAULT 0,
      date_achieved TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cadet_id) REFERENCES cadets (id)
    )
  `);
});

module.exports = { db };

const initialize = () => {
  // Staff table
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      birth_date TEXT,
      birth_time TEXT,
      birth_location TEXT,
      experience_years INTEGER DEFAULT 0,
      availability TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      specializations TEXT DEFAULT '[]',
      performance_rating REAL DEFAULT 0.5,
      preferred_tasks TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cadets table
  db.run(`
    CREATE TABLE IF NOT EXISTS cadets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      birth_date TEXT,
      birth_time TEXT,
      birth_location TEXT,
      behavior_score INTEGER DEFAULT 3,
      hiset_status TEXT DEFAULT 'not_started',
      placement_status TEXT DEFAULT 'none',
      incidents INTEGER DEFAULT 0,
      room_assignment TEXT,
      bed_assignment TEXT,
      assigned_mentor_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_mentor_id) REFERENCES staff(id)
    )
  `);

  // Mentorship logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS mentorship_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cadet_id INTEGER NOT NULL,
      mentor_id INTEGER NOT NULL,
      date DATE NOT NULL,
      notes TEXT,
      sentiment_score REAL,
      flagged BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cadet_id) REFERENCES cadets(id),
      FOREIGN KEY (mentor_id) REFERENCES staff(id)
    )
  `);

  // Inventory table
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      threshold INTEGER DEFAULT 10,
      usage_rate REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT,
      start_date DATETIME,
      end_date DATETIME,
      assigned_staff TEXT DEFAULT '[]',
      required_staff INTEGER DEFAULT 1,
      community_service_hours INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cadet_id INTEGER,
      staff_id INTEGER,
      assignment_type TEXT,
      compatibility_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cadet_id) REFERENCES cadets(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    )
  `);

  // Milestones table
  db.run(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cadet_id INTEGER NOT NULL,
      milestone_type TEXT NOT NULL,
      description TEXT,
      achieved_date DATE,
      badge_awarded TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cadet_id) REFERENCES cadets(id)
    )
  `);

  // Compliance logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS compliance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_type TEXT NOT NULL,
      description TEXT,
      meets_dod_standards BOOLEAN DEFAULT 1,
      checked_by INTEGER,
      check_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checked_by) REFERENCES staff(id)
    )
  `);

  console.log('Database initialized successfully');
};

module.exports = { db, initialize };
