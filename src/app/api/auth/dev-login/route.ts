import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { name, role = 'user' } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create a mock user for development with consistent IDs
    let mockUserId: string;
    if (role === 'owner') {
      mockUserId = 'dev-owner-1';
    } else {
      mockUserId = 'dev-user-1';
    }
    
    // Create profile in database using admin privileges
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: mockUserId,
        full_name: name,
        role
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: mockUserId,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@dev.local`,
        full_name: name,
        role
      }
    });

  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
