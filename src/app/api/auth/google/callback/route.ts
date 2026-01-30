import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserInfo, storeTokens } from '@/lib/google/oauth';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check if user denied consent
    if (error) {
      console.error('OAuth error from Google:', error);
      return NextResponse.redirect(new URL('/settings?error=denied', baseUrl));
    }

    // Verify we have a code
    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(new URL('/settings?error=no_code', baseUrl));
    }

    // Verify state matches our expected value
    if (state !== 'calendar_connect') {
      console.error('Invalid state:', state);
      return NextResponse.redirect(new URL('/settings?error=invalid_state', baseUrl));
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user info to store the email
    const userInfo = await getUserInfo(tokens.access_token);

    // Store tokens in database
    await storeTokens(tokens, userInfo.email);

    // Redirect to settings with success
    return NextResponse.redirect(new URL('/settings?connected=true', baseUrl));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/settings?error=token_exchange', baseUrl));
  }
}
