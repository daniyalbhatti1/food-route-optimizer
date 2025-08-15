import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

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
      console.log('Dev user detected, proceeding with job fetch');
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

    // Get delivery stops with order information
    const { data: stops, error: stopsError } = await supabase
      .from('delivery_stops')
      .select(`
        *,
        order:orders(delivery_lat, delivery_lng, customer_name, delivery_address)
      `)
      .eq('job_id', jobId)
      .order('seq');

    if (stopsError) {
      return NextResponse.json(
        { error: 'Failed to fetch delivery stops' },
        { status: 500 }
      );
    }

    // Build detailed route geometry from legs (actual road directions)
    let routeCoordinates = [];
    
    // Start with restaurant coordinates
    if (job.restaurant?.lat && job.restaurant?.lng) {
      routeCoordinates.push([job.restaurant.lng, job.restaurant.lat]);
    }

    // Add detailed route coordinates from each leg
    stops.forEach((stop, index) => {
      if (stop.leg && stop.leg.geometry && stop.leg.geometry.geometry) {
        // Extract coordinates from the leg's detailed geometry
        const legCoords = stop.leg.geometry.geometry.coordinates;
        if (Array.isArray(legCoords) && legCoords.length > 0) {
          // For the first leg, include all coordinates
          // For subsequent legs, skip the first coordinate to avoid duplication
          const coordsToAdd = index === 0 ? legCoords : legCoords.slice(1);
          routeCoordinates = routeCoordinates.concat(coordsToAdd);
        }
      } else if (stop.lat && stop.lng) {
        // Fallback to straight line if no detailed geometry
        routeCoordinates.push([stop.lng, stop.lat]);
      }
    });

    // Create route geometry with detailed road coordinates
    const routeGeometry = {
      type: 'LineString',
      coordinates: routeCoordinates
    };

    // Create legs data with proper structure
    const legs = stops
      .filter(stop => stop.leg)
      .map(stop => ({
        distanceMeters: stop.leg.distanceMeters || 0,
        durationSec: stop.leg.durationSec || 0,
        geometry: stop.leg.geometry || null
      }));

    return NextResponse.json({
      job,
      stops,
      route: {
        geometry: routeGeometry,
        legs: legs
      }
    });

  } catch (error) {
    console.error('Get delivery job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
