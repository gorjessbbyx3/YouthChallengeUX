
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bseobobmpvttwxrjvymw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Supabase tables
const initializeTables = async () => {
  try {
    console.log('Supabase client initialized successfully');
    
    // Test connection with multiple tables
    const tables = ['staff', 'cadets', 'documents', 'document_folders'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error && error.code === '42P01') {
          console.log(`Table '${table}' needs to be created in Supabase dashboard`);
        } else {
          console.log(`Table '${table}' is accessible`);
        }
      } catch (err) {
        console.log(`Error checking table '${table}':`, err.message);
      }
    }
    
    return supabase;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    throw error;
  }
};

module.exports = { supabase, initializeTables };
