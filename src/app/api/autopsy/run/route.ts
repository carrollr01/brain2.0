import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAutopsy } from '@/lib/autopsy/engine';
import type { AutopsySSEEvent } from '@/lib/autopsy/types';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { company_name, context } = await request.json();

    if (!company_name || typeof company_name !== 'string') {
      return new Response(JSON.stringify({ error: 'company_name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient();

    // Create report record with status='running'
    const { data: report, error: insertError } = await supabase
      .from('autopsy_reports')
      .insert({
        company_name: company_name.trim(),
        status: 'running',
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Supabase insert error:', insertError);
      return new Response(JSON.stringify({ error: `Failed to create report record: ${insertError?.message || 'unknown error'}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (event: AutopsySSEEvent) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      } catch {
        // Client disconnected, ignore write errors
      }
    };

    // Run autopsy in background (don't await)
    runAutopsy(company_name.trim(), context, report.id, sendEvent)
      .finally(async () => {
        try {
          await writer.close();
        } catch {
          // Already closed
        }
      });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
