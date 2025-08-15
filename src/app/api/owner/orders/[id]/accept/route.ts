import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(owner_id)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user owns the restaurant
    if (order.restaurant?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update order status to Accepted
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'Accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to accept order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accept order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
