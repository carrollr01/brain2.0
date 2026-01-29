import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple test endpoint that logs everything and saves to a debug table
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    console.log('=== TEST WEBHOOK HIT ===');
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    console.log('Raw body:', rawBody);
    console.log('========================');

    // Try to save to Supabase so we can verify the webhook was hit
    const supabase = createClient();

    // Create a simple log entry in notes table for debugging
    await supabase
      .from('notes')
      .insert({
        content: `WEBHOOK TEST: ${rawBody.substring(0, 500)}`,
        category: 'other',
        extracted_title: 'Debug: Webhook received',
        source_phone: 'test',
      });

    return NextResponse.json({
      status: 'received',
      bodyLength: rawBody.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'test webhook active' });
}
