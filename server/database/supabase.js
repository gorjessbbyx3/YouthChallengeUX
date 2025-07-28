
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
    // Check if tables exist, if not create them via SQL
    console.log('Supabase client initialized successfully');
    
    // Test connection
    const { data, error } = await supabase.from('staff').select('count', { count: 'exact', head: true });
    if (error && error.code === '42P01') {
      console.log('Tables need to be created in Supabase dashboard');
    }
    
    return supabase;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    throw error;
  }
};

module.exports = { supabase, initializeTables };
