const TELNYX_API_KEY = process.env.TELNYX_API_KEY!;
const TELNYX_PHONE_NUMBER = process.env.TELNYX_PHONE_NUMBER!;

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
      },
      body: JSON.stringify({
        from: TELNYX_PHONE_NUMBER,
        to,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Telnyx SMS error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}
