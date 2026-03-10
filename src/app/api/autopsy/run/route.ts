import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAutopsy } from '@/lib/autopsy/engine';
import type { AutopsySSEEvent } from '@/lib/autopsy/types';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Validate env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
      return new Response(JSON.stringify({ error: 'Server config error: missing SUPABASE_URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return new Response(JSON.stringify({ error: 'Server config error: missing SERVICE_ROLE_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'Server config error: missing ANTHROPIC_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { company_name, context } = await request.json();

    if (!company_name || typeof company_name !== 'string') {
      return new Response(JSON.stringify({ error: 'company_name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let supabase;
    try {
      supabase = createClient();
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError);
      return new Response(JSON.stringify({ error: `Failed to create Supabase client: ${clientError instanceof Error ? clientError.message : 'unknown'}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create report record with status='running'
    console.log('Inserting autopsy_reports record for:', company_name.trim());
    const { data: report, error: insertError } = await supabase
      .from('autopsy_reports')
      .insert({
        company_name: company_name.trim(),
        status: 'running',
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Supabase insert error:', JSON.stringify(insertError, null, 2));
      console.error('Insert error code:', insertError?.code);
      console.error('Insert error details:', insertError?.details);
      console.error('Insert error hint:', insertError?.hint);
      const errorDetail = insertError
        ? `${insertError.message} (code: ${insertError.code}, details: ${insertError.details || 'none'}, hint: ${insertError.hint || 'none'})`
        : 'No error returned but no data either';
      return new Response(JSON.stringify({ error: `Failed to create report: ${errorDetail}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Report record created:', report.id);

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
    console.error('Autopsy run route error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Stack trace:', stack);
    return new Response(JSON.stringify({ error: `Autopsy route error: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
