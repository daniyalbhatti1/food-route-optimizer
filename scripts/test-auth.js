#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing auth functions...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAuth() {
  try {
    console.log('🔄 Testing profile creation...');
    
    // Test creating a profile
    const testProfile = {
      id: 'test-dev-user',
      full_name: 'Test User',
      role: 'user'
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(testProfile, { onConflict: 'id' })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error creating profile:', error);
      return;
    }

    console.log('✅ Profile created successfully:', data);
    
    // Test reading the profile
    const { data: readData, error: readError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'test-dev-user')
      .single();
    
    if (readError) {
      console.log('❌ Error reading profile:', readError);
      return;
    }

    console.log('✅ Profile read successfully:', readData);
    console.log('\n🎉 Auth functions are working!');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testAuth();
