import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqlsgwzmlzvjqmaifedu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHNnd3ptbHp2anFtYWlmZWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNzAxMDAsImV4cCI6MjA5NTc0NjEwMH0.fhz1AMaXUs0AeVbcC9d_IYtdV8fu54DCsrkTUvdKJdU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing ministries table...');
  const res1 = await supabase.from('ministries').select('*').limit(1);
  console.log('Ministries:', res1);

  console.log('Testing ministry_materials table...');
  const res2 = await supabase.from('ministry_materials').select('*').limit(1);
  console.log('Materials:', res2);
}

test().catch(console.error);
