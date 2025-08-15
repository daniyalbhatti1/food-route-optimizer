import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { buildMatrix, getRouteDirections } from '@/lib/mapbox';
import { optimizeRoute, computeEtas } from '@/lib/route/heuristics';
import { CreateDeliveryRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateDeliveryRequest = await request.json();
    const { restaurantId, orderIds, freezeFirst } = body;

    // Get current user (support both auth users and dev users)
    let user;
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser) {
        user = authUser;
      }
    } catch (error) {
      // Auth failed, might be dev user
    }

    // For dev users, we need to get the user from the request headers or body
    if (!user) {
      // This is a simplified approach for dev - in production you'd want proper session handling
      // For now, we'll allow the request to proceed and check restaurant ownership differently
      console.log('Dev user detected, proceeding with delivery creation');
    }

    // Verify restaurant ownership (support both auth users and dev users)
    let restaurant;
    if (user) {
      // Regular auth user
      const { data: authRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .eq('owner_id', user.id)
        .single();
      
      if (restaurantError || !authRestaurant) {
        return NextResponse.json(
          { error: 'Restaurant not found or unauthorized' },
          { status: 404 }
        );
      }
      restaurant = authRestaurant;
    } else {
      // Dev user - just check if restaurant exists and is owned by dev-owner-1
      const { data: devRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .eq('owner_id', 'dev-owner-1')
        .single();
      
      if (restaurantError || !devRestaurant) {
        return NextResponse.json(
          { error: 'Restaurant not found or unauthorized' },
          { status: 404 }
        );
      }
      restaurant = devRestaurant;
    }

    // Get orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('id', orderIds)
      .eq('restaurant_id', restaurantId)
      .in('status', ['Pending', 'Accepted']);

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'No eligible orders found' },
        { status: 400 }
      );
    }

    // Check if all orders have coordinates
    const ordersWithCoords = orders.filter(order => 
      order.delivery_lat && order.delivery_lng
    );

    if (ordersWithCoords.length === 0) {
      return NextResponse.json(
        { error: 'No orders with valid delivery addresses' },
        { status: 400 }
      );
    }

    // Build points array for route optimization
    const points = [
      // Restaurant location (start point)
      { lat: restaurant.lat!, lng: restaurant.lng! },
      // Delivery points
      ...ordersWithCoords.map(order => ({
        lat: order.delivery_lat!,
        lng: order.delivery_lng!
      }))
    ];

    // Build travel matrix
    const matrix = await buildMatrix(points);

    // Optimize route
    const optimizationResult = optimizeRoute(matrix, 0, freezeFirst);

    // Get route directions
    const orderedPoints = optimizationResult.route.map(index => points[index]);
    const legs = await getRouteDirections(orderedPoints);

    // Calculate ETAs
    const startTime = new Date();
    const etas = computeEtas(legs, startTime);

    // Create delivery job
    const { data: job, error: jobError } = await supabase
      .from('delivery_jobs')
      .insert({
        restaurant_id: restaurantId,
        status: 'Planned',
        algorithm: 'nearest-neighbor-2opt',
        totals: {
          distanceMeters: optimizationResult.totalDistance,
          durationSec: optimizationResult.totalDuration
        }
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to create delivery job' },
        { status: 500 }
      );
    }

    // Create delivery stops
    const stops = optimizationResult.route.slice(1).map((pointIndex, stopIndex) => {
      const order = ordersWithCoords[stopIndex];
      const leg = legs[stopIndex];
      
      return {
        job_id: job.id,
        order_id: order.id,
        seq: stopIndex + 1,
        lat: points[pointIndex].lat,
        lng: points[pointIndex].lng,
        eta: etas[stopIndex].toISOString(),
        status: 'Planned',
        leg: leg ? {
          distanceMeters: leg.distanceMeters,
          durationSec: leg.durationSec,
          geometry: leg.geometry
        } : null
      };
    });

    const { error: stopsError } = await supabase
      .from('delivery_stops')
      .insert(stops);

    if (stopsError) {
      // Clean up job if stops creation fails
      await supabase.from('delivery_jobs').delete().eq('id', job.id);
      return NextResponse.json(
        { error: 'Failed to create delivery stops' },
        { status: 500 }
      );
    }

    // Update orders to OutForDelivery
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'OutForDelivery',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds);

    if (updateError) {
      console.error('Failed to update order statuses:', updateError);
      // Continue anyway - the delivery job is created
    }

    return NextResponse.json({
      jobId: job.id,
      route: optimizationResult.route,
      totalDistance: optimizationResult.totalDistance,
      totalDuration: optimizationResult.totalDuration,
      stops: stops.length
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
