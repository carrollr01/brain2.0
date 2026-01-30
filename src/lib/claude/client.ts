import Anthropic from '@anthropic-ai/sdk';
import { CLASSIFICATION_SYSTEM_PROMPT, CLASSIFICATION_USER_PROMPT } from './prompts';
import type { ClassificationItem, ClassificationResponse } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function classifyMessage(message: string): Promise<ClassificationItem[]> {
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
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
    const parsed = JSON.parse(content.text) as ClassificationResponse;

    // Validate we got an items array
    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items;
    }

    // Fallback if items array is missing or empty
    throw new Error('No items in response');
  } catch (error) {
    // Fallback for parsing errors - default to single note with 'other' category
    console.error('Failed to parse Claude response:', content.text, error);
    return [{
      type: 'note',
      confidence: 0.5,
      original_text: message,
      data: {
        category: 'other',
        extracted_title: null,
        extracted_context: message,
      },
    }];
  }
}
