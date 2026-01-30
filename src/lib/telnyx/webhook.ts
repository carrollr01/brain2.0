import type { TelnyxWebhookPayload, TelnyxWebhookBody } from './types';

export function parseTelnyxPayload(body: TelnyxWebhookBody): TelnyxWebhookPayload {
  const { data } = body;
  const { payload } = data;

  // Handle both array and single object formats for 'to' field
  let toNumber = '';
  if (payload.to) {
    if (Array.isArray(payload.to)) {
      toNumber = payload.to[0]?.phone_number || '';
    } else if (typeof payload.to === 'object') {
      toNumber = (payload.to as { phone_number?: string }).phone_number || '';
    }
  }

  return {
    eventType: data.event_type,
    from: payload.from?.phone_number || '',
    to: toNumber,
    text: payload.text || '',
    messageId: payload.id,
    timestamp: data.occurred_at,
  };
}

// Note: Telnyx webhook signature validation can be added here
// For now, we'll rely on the webhook URL being secret
// In production, implement proper signature verification
export function validateTelnyxWebhook(
  _body: unknown,
  _signature: string | null,
  _timestamp: string | null
): boolean {
  // TODO: Implement proper Telnyx signature validation
  // For development, accept all requests
  return true;
}
