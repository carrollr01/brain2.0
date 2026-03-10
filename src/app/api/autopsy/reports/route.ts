import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const search = request.nextUrl.searchParams.get('search') || '';

  let query = supabase
    .from('autopsy_reports')
    .select('id, company_name, status, error_message, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike('company_name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
