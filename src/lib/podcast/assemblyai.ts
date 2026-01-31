const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

interface AssemblyAITranscript {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string | null;
  error: string | null;
  audio_duration: number | null;
}

// Submit audio URL for transcription
async function submitTranscription(audioUrl: string): Promise<string> {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_detection: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AssemblyAI submission failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.id;
}

// Poll for transcription completion
async function pollTranscription(transcriptId: string): Promise<AssemblyAITranscript> {
  const maxAttempts = 120; // 10 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`AssemblyAI poll failed: ${response.status}`);
    }

    const result: AssemblyAITranscript = await response.json();

    if (result.status === 'completed') {
      return result;
    }

    if (result.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${result.error}`);
    }

    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('AssemblyAI transcription timed out');
}

export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  console.log(`Submitting to AssemblyAI: ${audioUrl}`);

  // Submit the audio URL directly (no download needed!)
  const transcriptId = await submitTranscription(audioUrl);
  console.log(`AssemblyAI transcript ID: ${transcriptId}`);

  // Poll for completion
  console.log('Waiting for transcription to complete...');
  const result = await pollTranscription(transcriptId);

  if (!result.text) {
    throw new Error('AssemblyAI returned empty transcript');
  }

  console.log(`Transcription complete: ${result.text.length} characters`);

  return {
    text: result.text,
    duration: result.audio_duration || undefined,
  };
}
