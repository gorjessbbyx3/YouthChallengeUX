
const { Pool } = require('pg');

// Create connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    return false;
  }
};

// Initialize database tables for YCA CRM
const initializeTables = async () => {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        birth_date DATE,
        birth_time TIME,
        birth_location VARCHAR(255),
        experience_years INTEGER DEFAULT 0,
        availability JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'active',
        specializations JSONB DEFAULT '[]',
        performance_rating DECIMAL(3,2) DEFAULT 0.5,
        preferred_tasks JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cadets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        age INTEGER,
        birth_date DATE,
        birth_time TIME,
        birth_location VARCHAR(255),
        behavior_score INTEGER DEFAULT 3,
        hiset_status VARCHAR(50) DEFAULT 'not_started',
        placement_status VARCHAR(50) DEFAULT 'none',
        incidents INTEGER DEFAULT 0,
        room_assignment VARCHAR(20),
        bed_assignment VARCHAR(20),
        assigned_mentor_id INTEGER REFERENCES staff(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        cadet_id INTEGER REFERENCES cadets(id),
        relationship VARCHAR(50),
        emergency_contact BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        cadet_id INTEGER REFERENCES cadets(id),
        milestone_type VARCHAR(100) NOT NULL,
        description TEXT,
        points INTEGER DEFAULT 0,
        badge_awarded VARCHAR(100),
        achieved_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_logs (
        id SERIAL PRIMARY KEY,
        log_type VARCHAR(100) NOT NULL,
        description TEXT,
        meets_dod_standards BOOLEAN DEFAULT true,
        checked_by INTEGER REFERENCES staff(id),
        check_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS communications (
        id SERIAL PRIMARY KEY,
        cadet_id INTEGER REFERENCES cadets(id),
        recipient_type VARCHAR(50) NOT NULL,
        recipient_contact VARCHAR(255) NOT NULL,
        method VARCHAR(20) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'sent',
        sent_by INTEGER REFERENCES staff(id),
        follow_up_required BOOLEAN DEFAULT false,
        follow_up_date DATE,
        follow_up_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(100),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        assigned_staff JSONB DEFAULT '[]',
        required_staff INTEGER DEFAULT 1,
        community_service_hours INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        threshold INTEGER DEFAULT 10,
        usage_rate DECIMAL(10,2) DEFAULT 0,
        cost_per_unit DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS behavioral_tracking (
        id SERIAL PRIMARY KEY,
        cadet_id INTEGER REFERENCES cadets(id),
        behavior_type VARCHAR(100) NOT NULL,
        severity INTEGER CHECK(severity >= 1 AND severity <= 10),
        context TEXT,
        intervention TEXT,
        notes TEXT,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS academic_tracking (
        id SERIAL PRIMARY KEY,
        cadet_id INTEGER REFERENCES cadets(id),
        subject VARCHAR(100) NOT NULL,
        assignment_type VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        max_score INTEGER DEFAULT 100,
        date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('PostgreSQL tables initialized successfully');
  } catch (error) {
    console.error('Error initializing PostgreSQL tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, testConnection, initializeTables };
