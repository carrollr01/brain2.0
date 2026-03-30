import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', id)
    .single();

  if (trackError) {
    if (trackError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }
    return NextResponse.json({ error: trackError.message }, { status: 500 });
  }

  const { data: opens, error: opensError } = await supabase
    .from('opens')
    .select('*')
    .eq('track_id', id)
    .order('opened_at', { ascending: false });

  if (opensError) {
    return NextResponse.json({ error: opensError.message }, { status: 500 });
  }

  return NextResponse.json({ ...track, opens: opens || [] });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  const { error } = await supabase.from('tracks').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
