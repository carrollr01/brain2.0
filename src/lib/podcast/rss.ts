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

    if (audioUrl) {
      episodes.push({
        title: episodeTitle,
        description: episodeDesc,
        pubDate,
        audioUrl,
        duration,
        guid,
      });
    }
  }

  return { title, description, episodes };
}

export async function getRecentEpisodes(
  rssUrl: string,
  since: Date,
  limit: number = 3
): Promise<RSSEpisode[]> {
  const feed = await fetchRSSFeed(rssUrl);

  return feed.episodes
    .filter(ep => new Date(ep.pubDate) >= since)
    .slice(0, limit);
}
