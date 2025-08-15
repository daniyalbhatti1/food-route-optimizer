import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { geocodeAddress } from '@/lib/mapbox';
import { CreateOrderRequest, CreateOrderResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { restaurantId, items, customer } = body;

    // Validate input
    if (!restaurantId || !items || items.length === 0 || !customer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current user (support both auth users and dev users)
    let userId: string;
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser) {
        userId = authUser.user.id;
      } else {
        throw new Error('No authenticated user');
      }
    } catch (error) {
      // Auth failed, might be dev user
      console.log('Dev user detected, using default user ID');
      userId = 'dev-user-1';
    }

    // Geocode the delivery address
    let deliveryLat: number | null = null;
    let deliveryLng: number | null = null;
    
    try {
      const geocodeResult = await geocodeAddress(customer.address);
      deliveryLat = geocodeResult.lat;
      deliveryLng = geocodeResult.lng;
    } catch (error) {
      console.error('Geocoding error:', error);
      // Continue without coordinates - order can still be placed
    }

    // Get menu items to snapshot their current data
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price_cents')
      .in('id', items.map(item => item.menuItemId));

    if (menuError) {
      return NextResponse.json(
        { error: 'Failed to fetch menu items' },
        { status: 500 }
      );
    }

    // Create a map for quick lookup
    const menuItemMap = new Map(menuItems.map(item => [item.id, item]));

    // Validate all items exist
    for (const item of items) {
      if (!menuItemMap.has(item.menuItemId)) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 400 }
        );
      }
    }

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        delivery_address: customer.address,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        status: 'Pending'
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items with snapshots
    const orderItems = items.map(item => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      return {
        order_id: order.id,
        menu_item_id: item.menuItemId,
        name_snapshot: menuItem.name,
        price_cents_snapshot: menuItem.price_cents,
        qty: item.qty
      };
    });

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      // Clean up the order if order items creation fails
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    const response: CreateOrderResponse = {
      orderId: order.id,
      status: order.status
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
