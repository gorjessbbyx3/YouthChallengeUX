
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://bseobobmpvttwxrjvymw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('Setting up Supabase database schema...');
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../server/database/supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
        } else {
          console.log('✓ Statement executed successfully');
        }
      } catch (err) {
        console.error('Error with statement:', err.message);
      }
    }
    
    console.log('Database setup complete!');
    
    // Test the setup by checking if tables exist
    const testTables = ['staff', 'cadets', 'documents'];
    for (const table of testTables) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        console.error(`Error accessing table ${table}:`, error.message);
      } else {
        console.log(`✓ Table ${table} is accessible`);
      }
    }
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
