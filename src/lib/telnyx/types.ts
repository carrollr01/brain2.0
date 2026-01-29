export interface TelnyxWebhookPayload {
  eventType: string;
  from: string;
  to: string;
  text: string;
  messageId: string;
  timestamp: string;
}

export interface TelnyxWebhookBody {
  data: {
    event_type: string;
    occurred_at: string;
    payload: {
      id: string;
      from: {
        phone_number: string;
      };
      to: Array<{
        phone_number: string;
      }>;
      text: string;
    };
  };
}
