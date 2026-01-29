import Anthropic from '@anthropic-ai/sdk';
import { CLASSIFICATION_SYSTEM_PROMPT, CLASSIFICATION_USER_PROMPT } from './prompts';
import type { ClassificationResult } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function classifyMessage(message: string): Promise<ClassificationResult> {
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    system: CLASSIFICATION_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: CLASSIFICATION_USER_PROMPT(message) }
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(content.text) as ClassificationResult;
    return parsed;
  } catch {
    // Fallback for parsing errors - default to note with 'other' category
    console.error('Failed to parse Claude response:', content.text);
    return {
      type: 'note',
      confidence: 0.5,
      data: {
        category: 'other',
        extracted_title: null,
        extracted_context: message,
      },
    };
  }
}
