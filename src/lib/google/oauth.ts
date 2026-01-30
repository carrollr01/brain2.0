import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import type { GoogleTokens, GoogleUserInfo } from './types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to always get refresh token
  });
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }

  const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type || 'Bearer',
    expires_at: expiresAt,
    scope: tokens.scope || SCOPES.join(' '),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  const expiresAt = new Date(Date.now() + (credentials.expiry_date || 3600 * 1000));

  return {
    access_token: credentials.access_token,
    refresh_token: refreshToken, // Keep original refresh token
    token_type: credentials.token_type || 'Bearer',
    expires_at: expiresAt,
    scope: credentials.scope || SCOPES.join(' '),
  };
}

export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email || '',
    name: data.name || undefined,
  };
}

export async function storeTokens(tokens: GoogleTokens, email: string): Promise<void> {
  const supabase = createClient();

  // Upsert - only one row allowed due to unique constraint
  const { error } = await supabase
    .from('google_oauth_tokens')
    .upsert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: tokens.expires_at.toISOString(),
      scope: tokens.scope,
      google_email: email,
    }, {
      onConflict: 'id',
    });

  if (error) {
    // If upsert fails due to unique constraint, delete and insert
    await supabase.from('google_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error: insertError } = await supabase
      .from('google_oauth_tokens')
      .insert({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: tokens.expires_at.toISOString(),
        scope: tokens.scope,
        google_email: email,
      });

    if (insertError) {
      throw new Error(`Failed to store tokens: ${insertError.message}`);
    }
  }
}

export async function getValidTokens(): Promise<GoogleTokens | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  const expiresAt = new Date(data.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(data.refresh_token);
      await storeTokens(newTokens, data.google_email || '');
      return newTokens;
    } catch {
      // If refresh fails, return null (user needs to reconnect)
      return null;
    }
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_at: expiresAt,
    scope: data.scope,
  };
}

export async function isConnected(): Promise<{ connected: boolean; email?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('google_email, expires_at')
    .limit(1)
    .single();

  if (error || !data) {
    return { connected: false };
  }

  // Check if we can get valid tokens (will refresh if needed)
  const tokens = await getValidTokens();

  return {
    connected: tokens !== null,
    email: data.google_email || undefined,
  };
}

export async function disconnect(): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('google_oauth_tokens')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
}

export function getAuthorizedOAuth2Client(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}
