import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/telnyx/client';

// Test endpoint to send an SMS - visit /api/test-sms?to=+1YOURNUMBER
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to');

  if (!to) {
    return NextResponse.json({
      error: 'Missing "to" parameter. Use /api/test-sms?to=+1YOURNUMBER'
    }, { status: 400 });
  }

  console.log('Attempting to send test SMS to:', to);
  console.log('Using TELNYX_PHONE_NUMBER:', process.env.TELNYX_PHONE_NUMBER);
  console.log('TELNYX_API_KEY exists:', !!process.env.TELNYX_API_KEY);

  try {
    const success = await sendSMS(to, 'Test message from Second Brain! If you receive this, outbound SMS is working.');

    return NextResponse.json({
      success,
      to,
      from: process.env.TELNYX_PHONE_NUMBER,
      message: success ? 'SMS sent successfully' : 'SMS failed to send'
    });
  } catch (error) {
    console.error('Test SMS error:', error);
    return NextResponse.json({
      error: String(error),
      to,
      from: process.env.TELNYX_PHONE_NUMBER
    }, { status: 500 });
  }
}
