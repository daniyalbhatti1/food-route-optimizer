import { createClient } from '@supabase/supabase-js';

// Load environment variables FIRST
require('dotenv').config({ path: '.env.local' });

// Import mapbox functions AFTER loading env vars
import { geocodeAddress } from '../src/lib/mapbox';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create test users (for dev login system)
    console.log('Creating test users...');
    
    const testUsers = [
      {
        id: 'dev-owner-1',
        full_name: 'Restaurant Owner',
        role: 'owner' as const
      },
      {
        id: 'dev-user-1',
        full_name: 'Test Customer',
        role: 'user' as const
      }
    ];

    // First, let's create the profiles without foreign key constraints
    for (const user of testUsers) {
      const { error } = await supabase
        .from('profiles')
        .upsert(user, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error creating user ${user.full_name}:`, error);
      } else {
        console.log(`✅ Created user: ${user.full_name}`);
      }
    }

    // Create restaurant
    console.log('Creating restaurant...');
    
    const restaurantAddress = '123 Main St, San Francisco, CA 94105';
    let restaurantLat = 37.7749;
    let restaurantLng = -122.4194;

    try {
      const geocodeResult = await geocodeAddress(restaurantAddress);
      restaurantLat = geocodeResult.lat;
      restaurantLng = geocodeResult.lng;
    } catch (error) {
      console.warn('Failed to geocode restaurant address, using default coordinates');
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        owner_id: 'dev-owner-1',
        name: 'Pizza Palace',
        cuisine: 'Italian',
        address: restaurantAddress,
        lat: restaurantLat,
        lng: restaurantLng
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      return;
    }

    console.log(`✅ Created restaurant: ${restaurant.name}`);

    // Create menu items
    console.log('Creating menu items...');
    
    const menuItems = [
      {
        restaurant_id: restaurant.id,
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, tomato sauce, and basil',
        price_cents: 1800
      },
      {
        restaurant_id: restaurant.id,
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni with mozzarella and tomato sauce',
        price_cents: 2000
      },
      {
        restaurant_id: restaurant.id,
        name: 'Chicken Alfredo Pasta',
        description: 'Creamy alfredo sauce with grilled chicken',
        price_cents: 1600
      },
      {
        restaurant_id: restaurant.id,
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce, parmesan, and caesar dressing',
        price_cents: 1200
      },
      {
        restaurant_id: restaurant.id,
        name: 'Garlic Bread',
        description: 'Toasted bread with garlic butter and herbs',
        price_cents: 600
      },
      {
        restaurant_id: restaurant.id,
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee and mascarpone',
        price_cents: 800
      }
    ];

    const { data: createdMenuItems, error: menuError } = await supabase
      .from('menu_items')
      .insert(menuItems)
      .select();

    if (menuError) {
      console.error('Error creating menu items:', menuError);
      return;
    }

    console.log(`✅ Created ${createdMenuItems.length} menu items`);

    // Create sample orders (optional)
    console.log('Creating sample orders...');
    
    const sampleAddresses = [
      '456 Market St, San Francisco, CA 94105',
      '789 Mission St, San Francisco, CA 94103',
      '321 Folsom St, San Francisco, CA 94105'
    ];

    const sampleOrders = [];
    for (let i = 0; i < 3; i++) {
      let deliveryLat = 37.7749 + (Math.random() - 0.5) * 0.01;
      let deliveryLng = -122.4194 + (Math.random() - 0.5) * 0.01;

      try {
        const geocodeResult = await geocodeAddress(sampleAddresses[i]);
        deliveryLat = geocodeResult.lat;
        deliveryLng = geocodeResult.lng;
      } catch (error) {
        console.warn(`Failed to geocode address ${sampleAddresses[i]}, using random coordinates`);
      }

      sampleOrders.push({
        user_id: 'dev-user-1',
        restaurant_id: restaurant.id,
        status: 'Pending' as const,
        customer_name: `Customer ${i + 1}`,
        customer_phone: `555-000${i + 1}`,
        delivery_address: sampleAddresses[i],
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng
      });
    }

    const { data: createdOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(sampleOrders)
      .select();

    if (ordersError) {
      console.error('Error creating sample orders:', ordersError);
    } else {
      console.log(`✅ Created ${createdOrders.length} sample orders`);

      // Create order items for each order
      for (const order of createdOrders) {
        const orderItems = [
          {
            order_id: order.id,
            menu_item_id: createdMenuItems[0].id, // Margherita Pizza
            name_snapshot: createdMenuItems[0].name,
            price_cents_snapshot: createdMenuItems[0].price_cents,
            qty: 1
          },
          {
            order_id: order.id,
            menu_item_id: createdMenuItems[4].id, // Garlic Bread
            name_snapshot: createdMenuItems[4].name,
            price_cents_snapshot: createdMenuItems[4].price_cents,
            qty: 2
          }
        ];

        const { error: orderItemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (orderItemsError) {
          console.error(`Error creating order items for order ${order.id}:`, orderItemsError);
        }
      }

      console.log('✅ Created order items for sample orders');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log('- Restaurant Owner: dev-owner-1');
    console.log('- Test Customer: dev-user-1');
    console.log('- Restaurant: Pizza Palace');
    console.log('- Menu Items: 6 items');
    console.log('- Sample Orders: 3 orders');
    console.log('\n🔗 Next Steps:');
    console.log('1. Set up your environment variables in .env.local');
    console.log('2. Run the development server: npm run dev');
    console.log('3. Visit http://localhost:3000');
    console.log('4. Use the development login to test the application');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
