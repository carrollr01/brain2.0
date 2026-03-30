import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const search = request.nextUrl.searchParams.get('search') || '';

  let query = supabase
    .from('tracks')
    .select('*, opens(count)')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `label.ilike.%${search}%,recipient.ilike.%${search}%,subject.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tracks = (data || []).map((t: Record<string, unknown>) => ({
    ...t,
    open_count: Array.isArray(t.opens) && t.opens.length > 0
      ? (t.opens[0] as { count: number }).count
      : 0,
    opens: undefined,
  }));

  return NextResponse.json(tracks);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();
  const { id, label, recipient, subject } = body;

  if (!label) {
    return NextResponse.json({ error: 'Label is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tracks')
    .insert({
      id: id || crypto.randomUUID().slice(0, 8),
      label,
      recipient: recipient || null,
      subject: subject || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
