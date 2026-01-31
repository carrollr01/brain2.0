import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  let query = supabase
    .from('digests')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(
      `topic_of_day.ilike.%${search}%,unique_takes.ilike.%${search}%,top_developments.ilike.%${search}%,strong_opinions.ilike.%${search}%,people_power.ilike.%${search}%,actionable_intel.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
