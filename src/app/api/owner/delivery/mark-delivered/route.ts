import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { MarkDeliveredRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: MarkDeliveredRequest = await request.json();
    const { jobId, stopId } = body;

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
      console.log('Dev user detected, proceeding with mark delivered');
    }

    // Get delivery job and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('delivery_jobs')
      .select(`
        *,
        restaurant:restaurants(owner_id)
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

    // Get the specific stop
    const { data: stop, error: stopError } = await supabase
      .from('delivery_stops')
      .select('*')
      .eq('id', stopId)
      .eq('job_id', jobId)
      .single();

    if (stopError || !stop) {
      return NextResponse.json(
        { error: 'Delivery stop not found' },
        { status: 404 }
      );
    }

    // Mark the stop as delivered
    const { error: updateStopError } = await supabase
      .from('delivery_stops')
      .update({
        status: 'Delivered'
      })
      .eq('id', stopId);

    if (updateStopError) {
      return NextResponse.json(
        { error: 'Failed to mark stop as delivered' },
        { status: 500 }
      );
    }

    // Update the corresponding order to Delivered
    if (stop.order_id) {
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          status: 'Delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', stop.order_id);

      if (updateOrderError) {
        console.error('Failed to update order status:', updateOrderError);
      }
    }

    // Check if all stops are delivered
    const { data: remainingStops, error: remainingError } = await supabase
      .from('delivery_stops')
      .select('id')
      .eq('job_id', jobId)
      .not('status', 'eq', 'Delivered');

    if (remainingError) {
      console.error('Failed to check remaining stops:', remainingError);
    } else if (remainingStops.length === 0) {
      // All stops delivered, mark job as completed
      const { error: completeJobError } = await supabase
        .from('delivery_jobs')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (completeJobError) {
        console.error('Failed to complete delivery job:', completeJobError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark delivered error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
