import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { buildMatrix, getRouteDirections } from '@/lib/mapbox';
import { optimizeRoute, computeEtas } from '@/lib/route/heuristics';
import { RecomputeDeliveryRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: RecomputeDeliveryRequest = await request.json();
    const { jobId, freezeFirst } = body;

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
      console.log('Dev user detected, proceeding with delivery recompute');
    }

    // Get delivery job and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('delivery_jobs')
      .select(`
        *,
        restaurant:restaurants(owner_id, lat, lng)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Delivery job not found' },
        { status: 404 }
      );
    }

    // Check if user owns the restaurant (support both auth users and dev users)
    if (user && job.restaurant?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // For dev users, check if restaurant is owned by dev-owner-1
    if (!user && job.restaurant?.owner_id !== 'dev-owner-1') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get remaining stops (not delivered)
    const { data: stops, error: stopsError } = await supabase
      .from('delivery_stops')
      .select(`
        *,
        order:orders(delivery_lat, delivery_lng)
      `)
      .eq('job_id', jobId)
      .not('status', 'eq', 'Delivered')
      .order('seq');

    if (stopsError) {
      return NextResponse.json(
        { error: 'Failed to fetch delivery stops' },
        { status: 500 }
      );
    }

    if (stops.length === 0) {
      return NextResponse.json(
        { error: 'No remaining stops to optimize' },
        { status: 400 }
      );
    }

    // Build points array for route optimization
    const points = [
      // Restaurant location (start point)
      { lat: job.restaurant.lat!, lng: job.restaurant.lng! },
      // Remaining delivery points
      ...stops.map(stop => ({
        lat: stop.order?.delivery_lat || stop.lat!,
        lng: stop.order?.delivery_lng || stop.lng!
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

    // Update delivery job totals
    const { error: updateJobError } = await supabase
      .from('delivery_jobs')
      .update({
        totals: {
          distanceMeters: optimizationResult.totalDistance,
          durationSec: optimizationResult.totalDuration
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateJobError) {
      return NextResponse.json(
        { error: 'Failed to update delivery job' },
        { status: 500 }
      );
    }

    // Update delivery stops with new sequence and ETAs
    const stopUpdates = optimizationResult.route.slice(1).map((pointIndex, stopIndex) => {
      const stop = stops[stopIndex];
      const leg = legs[stopIndex];
      
      return {
        id: stop.id,
        seq: stopIndex + 1,
        eta: etas[stopIndex].toISOString(),
        leg: leg ? {
          distanceMeters: leg.distanceMeters,
          durationSec: leg.durationSec,
          geometry: leg.geometry
        } : stop.leg
      };
    });

    // Update stops one by one (Supabase doesn't support bulk updates with different data)
    for (const update of stopUpdates) {
      const { error: updateStopError } = await supabase
        .from('delivery_stops')
        .update({
          seq: update.seq,
          eta: update.eta,
          leg: update.leg
        })
        .eq('id', update.id);

      if (updateStopError) {
        console.error('Failed to update stop:', updateStopError);
      }
    }

    return NextResponse.json({
      jobId: job.id,
      route: optimizationResult.route,
      totalDistance: optimizationResult.totalDistance,
      totalDuration: optimizationResult.totalDuration,
      stops: stops.length
    });
  } catch (error) {
    console.error('Recompute delivery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
