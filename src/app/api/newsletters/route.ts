import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get('search') || '';
  const sourceId = searchParams.get('source_id') || '';
  const isRead = searchParams.get('is_read');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('newsletters')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (sourceId) {
    query = query.eq('source_id', sourceId);
  }

  if (isRead === 'true') {
    query = query.eq('is_read', true);
  } else if (isRead === 'false') {
    query = query.eq('is_read', false);
  }

  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,sender.ilike.%${search}%,summary.ilike.%${search}%,content_text.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
