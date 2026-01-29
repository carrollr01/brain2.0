import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NoteCategory } from '@/types/database';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') as NoteCategory | 'all' | null;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (search) {
    // Search in content, extracted_title, and extracted_context
    query = query.or(
      `content.ilike.%${search}%,extracted_title.ilike.%${search}%,extracted_context.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();

  const { content, category, extracted_title, extracted_context } = body;

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      content,
      category: category || 'other',
      extracted_title: extracted_title || null,
      extracted_context: extracted_context || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
