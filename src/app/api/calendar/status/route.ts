import { NextResponse } from 'next/server';
import { isConnected, disconnect } from '@/lib/google/oauth';

export async function GET() {
  try {
    const status = await isConnected();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking calendar status:', error);
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    await disconnect();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
