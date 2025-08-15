#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔄 Resetting orders for testing...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetOrders() {
  try {
    console.log('🔄 Clearing delivery jobs and stops...');
    
    // Delete all delivery stops
    const { error: stopsError } = await supabase
      .from('delivery_stops')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (stopsError) {
      console.log('❌ Error deleting delivery stops:', stopsError);
    } else {
      console.log('✅ Deleted all delivery stops');
    }

    // Delete all delivery jobs
    const { error: jobsError } = await supabase
      .from('delivery_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (jobsError) {
      console.log('❌ Error deleting delivery jobs:', jobsError);
    } else {
      console.log('✅ Deleted all delivery jobs');
    }

    console.log('🔄 Resetting orders to Accepted status...');
    
    // Reset all orders to Accepted status
    const { error: ordersError } = await supabase
      .from('orders')
      .update({ 
        status: 'Accepted',
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
    
    if (ordersError) {
      console.log('❌ Error updating orders:', ordersError);
    } else {
      console.log('✅ Reset all orders to Accepted status');
    }

    console.log('\n🎉 Orders reset completed!');
    console.log('📋 You can now test the delivery creation again.');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

resetOrders();
