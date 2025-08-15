#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase connection...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log(`URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('🔄 Testing connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST205') {
        console.log('❌ Tables do not exist yet!');
        console.log('📋 You need to run the database schema first:');
        console.log('   1. Go to your Supabase dashboard');
        console.log('   2. Open SQL Editor');
        console.log('   3. Copy and paste the contents of database.sql');
        console.log('   4. Click Run');
        console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard');
      } else {
        console.log('❌ Connection error:', error.message);
      }
    } else {
      console.log('✅ Connection successful!');
      console.log('✅ Tables exist and are accessible');
      console.log('\n🎉 You can now run: npm run seed');
    }
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testConnection();
