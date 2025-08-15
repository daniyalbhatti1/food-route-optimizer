#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧹 Cleaning up database...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDatabase() {
  try {
    console.log('🔄 Cleaning up duplicate restaurants...');
    
    // Get all restaurants owned by dev-owner-1
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', 'dev-owner-1')
      .order('created_at', { ascending: true });
    
    if (restaurantError) {
      console.log('❌ Error fetching restaurants:', restaurantError);
      return;
    }

    console.log(`Found ${restaurants.length} restaurants for owner`);
    
    if (restaurants.length > 1) {
      // Keep the first restaurant, delete the rest
      const restaurantsToDelete = restaurants.slice(1);
      
      for (const restaurant of restaurantsToDelete) {
        console.log(`🗑️  Deleting duplicate restaurant: ${restaurant.name} (${restaurant.id})`);
        
        // Delete related data first
        await supabase.from('delivery_stops').delete().eq('job_id', 
          supabase.from('delivery_jobs').select('id').eq('restaurant_id', restaurant.id)
        );
        await supabase.from('delivery_jobs').delete().eq('restaurant_id', restaurant.id);
        await supabase.from('order_items').delete().eq('order_id',
          supabase.from('orders').select('id').eq('restaurant_id', restaurant.id)
        );
        await supabase.from('orders').delete().eq('restaurant_id', restaurant.id);
        await supabase.from('menu_items').delete().eq('restaurant_id', restaurant.id);
        
        // Delete the restaurant
        await supabase.from('restaurants').delete().eq('id', restaurant.id);
      }
      
      console.log(`✅ Deleted ${restaurantsToDelete.length} duplicate restaurants`);
    }

    console.log('🔄 Updating orders to remove acceptance requirement...');
    
    // Update all orders to be automatically accepted
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'Pending');
    
    if (ordersError) {
      console.log('❌ Error fetching orders:', ordersError);
      return;
    }

    if (orders.length > 0) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Accepted' })
        .eq('status', 'Pending');
      
      if (updateError) {
        console.log('❌ Error updating orders:', updateError);
      } else {
        console.log(`✅ Updated ${orders.length} orders from Pending to Accepted`);
      }
    }

    console.log('\n🎉 Database cleanup completed!');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

cleanupDatabase();
