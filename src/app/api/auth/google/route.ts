import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/oauth';

export async function GET() {
  try {
    // Use a simple static state - the OAuth flow itself provides security
    // since only our callback URL is authorized in Google Cloud Console
    const state = 'calendar_connect';

    // Get the Google OAuth URL
    const authUrl = getAuthUrl(state);

    // Redirect to Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=oauth_init_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
