import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('newsletter_sources')
    .select('*')
    .order('sender_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();

  const { sender_email, sender_name, gmail_label } = body;

  if (!sender_email || !sender_name) {
    return NextResponse.json(
      { error: 'sender_email and sender_name are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('newsletter_sources')
    .insert({
      sender_email,
      sender_name,
      gmail_label: gmail_label || null,
      active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Source already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
