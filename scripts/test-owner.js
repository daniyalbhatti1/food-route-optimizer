#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing owner data access...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOwnerData() {
  try {
    console.log('🔄 Testing owner restaurants...');
    
    // Test getting restaurants owned by dev-owner-1
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', 'dev-owner-1');
    
    if (restaurantError) {
      console.log('❌ Error fetching restaurants:', restaurantError);
      return;
    }

    console.log(`✅ Found ${restaurants.length} restaurants for owner:`);
    restaurants.forEach(restaurant => {
      console.log(`   - ${restaurant.name} (${restaurant.id})`);
    });

    if (restaurants.length === 0) {
      console.log('⚠️  No restaurants found for owner');
      return;
    }

    const restaurantId = restaurants[0].id;
    console.log(`\n🔄 Testing orders for restaurant ${restaurantId}...`);
    
    // Test getting orders for the restaurant
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    if (orderError) {
      console.log('❌ Error fetching orders:', orderError);
      return;
    }

    console.log(`✅ Found ${orders.length} orders for restaurant:`);
    orders.forEach(order => {
      console.log(`   - Order ${order.id}: ${order.status} (${order.order_items.length} items)`);
    });

    console.log('\n🎉 Owner data access is working correctly!');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testOwnerData();
