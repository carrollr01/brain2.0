const GROQ_API_KEY = process.env.GROQ_API_KEY!;

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  // First, download the audio file
  console.log(`Downloading audio from: ${audioUrl}`);

  const audioResponse = await fetch(audioUrl, {
    headers: {
      'User-Agent': 'SecondBrain/1.0',
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();
  const audioBuffer = await audioBlob.arrayBuffer();

  // Check file size - Groq has a 25MB limit
  const fileSizeMB = audioBuffer.byteLength / (1024 * 1024);
  console.log(`Audio file size: ${fileSizeMB.toFixed(2)}MB`);

  if (fileSizeMB > 25) {
    console.warn(`Audio file too large (${fileSizeMB.toFixed(2)}MB), skipping transcription`);
    throw new Error('Audio file exceeds 25MB limit');
  }

  // Create form data for Groq API
  const formData = new FormData();

  // Determine file extension from URL or content type
  const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
  const extension = contentType.includes('mp3') ? 'mp3' : contentType.includes('m4a') ? 'm4a' : 'mp3';

  formData.append('file', new Blob([audioBuffer], { type: contentType }), `audio.${extension}`);
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');

  console.log('Sending to Groq Whisper API...');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq API error:', error);
    throw new Error(`Groq transcription failed: ${response.status} - ${error}`);
  }

  const result = await response.json();

  return {
    text: result.text,
    duration: result.duration,
  };
}
