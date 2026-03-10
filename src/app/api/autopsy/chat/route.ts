import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CHAT_SYSTEM_PROMPT } from '@/lib/autopsy/prompts';

const REPORT_CHAT_PROMPT = `You are a senior investment analyst discussing a company research report with the user. You have full access to the report below and should answer questions, debate points, and provide deeper analysis based on the evidence in the report.

Be direct, analytical, and concise. Reference specific findings from the report when answering. If the user challenges a point, engage substantively — defend with evidence or concede if the argument is strong. No hedging, no filler.

If the user asks about something not covered in the report, say so honestly and offer to reason through it with available evidence.

===== REPORT =====
`;

export async function POST(request: NextRequest) {
  try {
    const { messages, report_context } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Use report-specific system prompt if report context is provided
    const systemPrompt = report_context
      ? REPORT_CHAT_PROMPT + report_context
      : CHAT_SYSTEM_PROMPT;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    return NextResponse.json({ response: text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
