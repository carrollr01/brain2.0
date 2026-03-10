import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const reportId = request.nextUrl.searchParams.get('report_id');

  if (!reportId) {
    return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('autopsy_annotations')
    .select('*')
    .eq('report_id', reportId)
    .order('start_offset', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { report_id, highlighted_text, start_offset, end_offset, note, color } = body;

  if (!report_id || !highlighted_text || start_offset === undefined || end_offset === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('autopsy_annotations')
    .insert({
      report_id,
      highlighted_text,
      start_offset,
      end_offset,
      note: note || null,
      color: color || 'yellow',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
