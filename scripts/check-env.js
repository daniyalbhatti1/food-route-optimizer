#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'NEXT_PUBLIC_MAPBOX_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let allSet = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === 'REPLACE_ME') {
    console.log(`❌ ${varName}: Not set or still has placeholder value`);
    allSet = false;
  } else {
    console.log(`✅ ${varName}: Set (${value.substring(0, 10)}...)`);
  }
});

console.log('');

if (allSet) {
  console.log('🎉 All environment variables are properly configured!');
  console.log('You can now run: npm run dev');
} else {
  console.log('⚠️  Some environment variables are missing or have placeholder values.');
  console.log('Please edit .env.local and add your actual API keys.');
  console.log('See README.md for setup instructions.');
}

console.log('');
