import { RSSEpisode, PodcastFeed } from './types';

export async function fetchRSSFeed(rssUrl: string): Promise<PodcastFeed> {
  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'SecondBrain/1.0',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }

  const xml = await response.text();
  return parseRSSFeed(xml);
}

function parseRSSFeed(xml: string): PodcastFeed {
  // Simple XML parsing without external dependencies
  const getTagContent = (str: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = str.match(regex);
    return match ? (match[1] || match[2] || '').trim() : '';
  };

  const getAttr = (str: string, tag: string, attr: string): string => {
    const tagRegex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'i');
    const match = str.match(tagRegex);
    return match ? match[1] : '';
  };

  // Get channel info
  const channelMatch = xml.match(/<channel>([\s\S]*?)<\/channel>/i);
  const channelContent = channelMatch ? channelMatch[1] : xml;

  const title = getTagContent(channelContent, 'title');
  const description = getTagContent(channelContent, 'description');

  // Parse items/episodes
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const episodes: RSSEpisode[] = [];
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1];

    const episodeTitle = getTagContent(itemContent, 'title');
    const episodeDesc = getTagContent(itemContent, 'description') || getTagContent(itemContent, 'itunes:summary');
    const pubDate = getTagContent(itemContent, 'pubDate');
    const guid = getTagContent(itemContent, 'guid') || episodeTitle;

    // Get audio URL from enclosure tag
    const audioUrl = getAttr(itemContent, 'enclosure', 'url');

    // Get duration from itunes:duration
    const durationStr = getTagContent(itemContent, 'itunes:duration');
    let duration: number | undefined;
    if (durationStr) {
      // Duration can be in seconds or HH:MM:SS format
      if (durationStr.includes(':')) {
        const parts = durationStr.split(':').map(Number);
        if (parts.length === 3) {
          duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          duration = parts[0] * 60 + parts[1];
        }
      } else {
        duration = parseInt(durationStr, 10);
      }
    }

    // Check for podcast:transcript tag (Podcasting 2.0 standard)
    const transcriptUrl = getAttr(itemContent, 'podcast:transcript', 'url');

    if (audioUrl) {
      episodes.push({
        title: episodeTitle,
        description: episodeDesc,
        pubDate,
        audioUrl,
        duration,
        guid,
        transcriptUrl: transcriptUrl || undefined,
      });
    }
  }

  return { title, description, episodes };
}

export async function getRecentEpisodes(
  rssUrl: string,
  since: Date | null = null,
  limit: number = 3
): Promise<RSSEpisode[]> {
  const feed = await fetchRSSFeed(rssUrl);

  // If no since date provided, just return the most recent episodes
  if (!since) {
    return feed.episodes.slice(0, limit);
  }

  // Filter by date if provided
  const filtered = feed.episodes.filter((ep) => {
    const epDate = new Date(ep.pubDate);
    // Check if date is valid
    if (isNaN(epDate.getTime())) {
      console.warn(`Invalid date for episode: ${ep.title}, pubDate: ${ep.pubDate}`);
      return true; // Include episodes with invalid dates
    }
    return epDate >= since;
  });

  return filtered.slice(0, limit);
}

// Check if episode was published today
export function isPublishedToday(pubDate: string): boolean {
  const episodeDate = new Date(pubDate);
  const today = new Date();

  return (
    episodeDate.getFullYear() === today.getFullYear() &&
    episodeDate.getMonth() === today.getMonth() &&
    episodeDate.getDate() === today.getDate()
  );
}

// Fetch transcript from URL if available in RSS
export async function fetchTranscriptFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SecondBrain/1.0' },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';

    // Handle different transcript formats
    if (contentType.includes('json')) {
      const json = await response.json();
      // Common JSON transcript formats
      if (json.segments) {
        return json.segments.map((s: { text: string }) => s.text).join(' ');
      }
      if (json.text) return json.text;
      if (json.transcript) return json.transcript;
    }

    // Plain text or SRT/VTT
    const text = await response.text();

    // Strip SRT/VTT formatting if present
    if (text.includes('-->')) {
      return text
        .replace(/\d+\n\d{2}:\d{2}:\d{2}[.,]\d{3} --> \d{2}:\d{2}:\d{2}[.,]\d{3}\n/g, '')
        .replace(/WEBVTT\n\n/g, '')
        .replace(/\n\n+/g, ' ')
        .trim();
    }

    return text;
  } catch (error) {
    console.error('Failed to fetch transcript from URL:', error);
    return null;
  }
}
